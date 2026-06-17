// server/controllers/registration.controller.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const mockStore = require('../lib/mockStore');
const prisma = require('../lib/prisma');
const redis = require('../services/redis.service');
const s3Service = require('../services/s3.service');
const imageService = require('../services/image.service');
const duplicateService = require('../services/duplicate.service');
const { genSubmissionId } = require('../lib/helpers');

async function searchRegistrations(req, res) {
  const { clientId, category, q } = req.query;
  if (!clientId || !category) {
    return res.status(400).json({ error: 'clientId and category required' });
  }

  if (config.USE_MOCK_SERVICES) {
    const records = mockStore.listRegistrations({ clientId, category, q, approvedOnly: true })
      .slice(0, 20)
      .map(({ id, submissionId, fields }) => ({ id, submissionId, fields }));
    return res.json(records);
  }

  try {
    const records = await prisma.registration.findMany({
      where: {
        clientId,
        category,
        status: 'approved',
        fields: { path: '$.name', string_contains: q || '' },
      },
      select: { id: true, submissionId: true, fields: true },
      take: 20,
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function checkDuplicateRegistration(req, res) {
  const { clientId, category, fields } = req.body;
  try {
    const dup = await duplicateService.checkDuplicate(clientId, category, fields);
    res.json({ duplicate: dup });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createRegistration(req, res) {
  const { clientId, sector, category, fields, mode } = req.body;

  if (!clientId || !category || !fields) {
    return res.status(400).json({ error: 'clientId, category, and fields are required' });
  }

  // Validate Others category requires admin token
  if (category === 'Others') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(403).json({ error: 'Others category requires admin authorization' });
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Admin role required for Others' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Invalid admin token' });
    }
  }

  try {
    const duplicate = await duplicateService.checkDuplicate(clientId, category, fields);

    if (config.USE_MOCK_SERVICES) {
      const reg = mockStore.createRegistration({
        clientId,
        sector,
        category,
        fields,
        mode,
        hasDuplicateWarning: !!duplicate,
        duplicateRef: duplicate?.submissionId || null,
      });

      return res.status(201).json({
        registrationId: reg.id,
        submissionId: reg.submissionId,
        duplicate,
      });
    }

    const submissionId = genSubmissionId();

    const reg = await prisma.registration.create({
      data: {
        submissionId,
        clientId,
        sector,
        category,
        fields,
        mode: mode || 'manual',
        status: 'pending',
        hasDuplicateWarning: !!duplicate,
        duplicateRef: duplicate?.submissionId || null,
      },
    });

    // Invalidate dup cache for this client+category
    await redis.del(`dup:${clientId}:${category}`);

    res.status(201).json({
      registrationId: reg.id,
      submissionId,
      duplicate,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function uploadImages(req, res) {
  const { id } = req.params;
  const { angles } = req.body; // JSON array: [{angleIndex, angleName}]
  const files = req.files;

  if (!files?.length) return res.status(400).json({ error: 'No files uploaded' });

  try {
    const reg = config.USE_MOCK_SERVICES
      ? mockStore.getRegistrationByIdOrSubmissionId(id)
      : await prisma.registration.findUnique({ where: { id } });
    if (!reg) return res.status(404).json({ error: 'Registration not found' });

    const isObject = reg.category === 'Object';
    const angleData = isObject ? null : JSON.parse(angles || '[]');

    const uploaded = [];
    const rejected = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const angle = isObject ? null : angleData[i];

      // Run approval check
      const approval = await imageService.approveImage(file.buffer, angle?.angleIndex);

      if (!approval.approved) {
        rejected.push({ index: i, reason: approval.reason });
        continue;
      }

      // Only approved images go to S3
      const ext = file.mimetype.split('/')[1];
      const key = `registrations/${id}/${isObject ? 'object' : `angle_${angle.angleIndex}`}_${Date.now()}.${ext}`;

      await s3Service.uploadToS3(file.buffer, key, file.mimetype);

      const img = config.USE_MOCK_SERVICES
        ? mockStore.addImage(id, {
            s3Key: key,
            angleIndex: angle?.angleIndex ?? null,
            angleName: angle?.angleName ?? 'object',
            fileSize: file.size,
          })
        : await prisma.image.create({
            data: {
              registrationId: id,
              s3Key: key,
              angleIndex: angle?.angleIndex ?? null,
              angleName: angle?.angleName ?? 'object',
              approved: true,
              fileSize: file.size,
            },
          });

      const signedUrl = await s3Service.getSignedImageUrl(key);
      uploaded.push({ imageId: img.id, angleIndex: angle?.angleIndex, signedUrl });
    }

    res.json({
      uploaded,
      rejected,
      totalApproved: uploaded.length,
      message: `${uploaded.length} image(s) approved and stored. ${rejected.length} rejected.`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getRegistrationDetails(req, res) {
  if (config.USE_MOCK_SERVICES) {
    const reg = mockStore.getRegistrationByIdOrSubmissionId(req.params.id);
    if (!reg) return res.status(404).json({ error: 'Not found' });

    const client = mockStore.getClientById(reg.clientId);
    const images = await Promise.all(
      reg.images.map(async (img) => ({
        ...img,
        signedUrl: await s3Service.getSignedImageUrl(img.s3Key),
      }))
    );

    return res.json({
      ...reg,
      images,
      client: client ? { name: client.name, gateId: client.gateId, logoKey: client.logoKey, logoUrl: null } : null,
    });
  }

  try {
    const reg = await prisma.registration.findFirst({
      where: { OR: [{ id: req.params.id }, { submissionId: req.params.id }] },
      include: { images: true, client: { select: { name: true, gateId: true, logoKey: true } } },
    });
    if (!reg) return res.status(404).json({ error: 'Not found' });

    // Sign image URLs
    for (const img of reg.images) {
      img.signedUrl = await s3Service.getSignedImageUrl(img.s3Key);
    }
    if (reg.client?.logoKey) {
      reg.client.logoUrl = await s3Service.getSignedImageUrl(reg.client.logoKey);
    }

    res.json(reg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  searchRegistrations,
  checkDuplicateRegistration,
  createRegistration,
  uploadImages,
  getRegistrationDetails
};
