// server/controllers/admin.controller.js
const xlsx = require('xlsx');
const config = require('../config');
const mockStore = require('../lib/mockStore');
const prisma = require('../lib/prisma');
const redis = require('../services/redis.service');
const { genSubmissionId } = require('../lib/helpers');

const REQUIRED_IMPORT_HEADERS = ['name'];

function normalizeImportRows(rows) {
  return rows
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const normalized = {};
      for (const [key, value] of Object.entries(row)) {
        const cleanKey = String(key || '').trim();
        if (!cleanKey) continue;
        normalized[cleanKey] = typeof value === 'string' ? value.trim() : value;
      }
      return normalized;
    })
    .filter((row) => row && Object.keys(row).length > 0);
}

function parseCsvBuffer(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let current = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      current.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      current.push(cell);
      if (current.some((value) => String(value).trim() !== '')) {
        rows.push(current);
      }
      current = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length || current.length) {
    current.push(cell);
    if (current.some((value) => String(value).trim() !== '')) {
      rows.push(current);
    }
  }

  if (!rows.length) return [];

  const headers = rows[0].map((header) => String(header || '').trim());
  return rows.slice(1).map((row) =>
    headers.reduce((acc, header, index) => {
      if (header) {
        acc[header] = row[index] ?? '';
      }
      return acc;
    }, {})
  );
}

function readImportRows(file) {
  const fileName = String(file.originalname || '').toLowerCase();
  if (fileName.endsWith('.csv') || file.mimetype === 'text/csv' || file.mimetype === 'application/csv') {
    return parseCsvBuffer(file.buffer);
  }

  const workbook = xlsx.read(file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet);
}

async function getSubmissions(req, res) {
  const { sector, clientId, category, status, page = 1, limit = 20 } = req.query;
  const numericPage = Number(page);
  const numericLimit = Number(limit);

  if (config.USE_MOCK_SERVICES) {
    const all = mockStore.listRegistrations({ sector, clientId, category, status }).map((item) => ({
      ...item,
      client: mockStore.getClientById(item.clientId),
    }));
    const start = (numericPage - 1) * numericLimit;
    return res.json({
      total: all.length,
      page: numericPage,
      limit: numericLimit,
      data: all.slice(start, start + numericLimit),
    });
  }

  const where = {};
  if (sector) where.sector = sector;
  if (clientId) where.clientId = clientId;
  if (category) where.category = category;
  if (status) where.status = status;

  try {
    const [total, submissions] = await Promise.all([
      prisma.registration.count({ where }),
      prisma.registration.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, gateId: true, sector: true } },
          images: { select: { id: true, angleName: true, approved: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (numericPage - 1) * numericLimit,
        take: numericLimit,
      }),
    ]);

    res.json({ total, page: numericPage, limit: numericLimit, data: submissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateSubmissionStatus(req, res) {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  if (config.USE_MOCK_SERVICES) {
    const reg = mockStore.updateRegistrationStatus(req.params.id, status);
    if (!reg) return res.status(404).json({ error: 'Registration not found' });
    return res.json(reg);
  }
  
  try {
    const existing = await prisma.registration.findFirst({
      where: {
        OR: [
          { id: req.params.id },
          { submissionId: req.params.id },
        ],
      },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const reg = await prisma.registration.update({
      where: { id: existing.id },
      data: { status, reviewedAt: new Date() },
    });
    res.json(reg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function uploadImport(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  
  const { clientId, category, sector } = req.body;
  if (!sector || !clientId || !category) {
    return res.status(400).json({ error: 'sector, clientId and category are required' });
  }

  try {
    const rows = normalizeImportRows(readImportRows(req.file));

    if (!rows.length) return res.status(400).json({ error: 'Empty sheet' });
    const headers = Object.keys(rows[0]).map((header) => header.toLowerCase());
    const missingHeaders = REQUIRED_IMPORT_HEADERS.filter((header) => !headers.includes(header));
    if (missingHeaders.length) {
      return res.status(400).json({ error: `Missing required column(s): ${missingHeaders.join(', ')}` });
    }

    if (config.USE_MOCK_SERVICES) {
      const imported = mockStore.importRegistrations(rows, { clientId, category, sector });
      return res.json({ imported, fileName: req.file.originalname, format: req.file.originalname.split('.').pop() });
    }

    // Bulk import as pre-existing records (approved, no images)
    const created = await prisma.registration.createMany({
      data: rows.map(row => ({
        submissionId: genSubmissionId(),
        clientId,
        sector: row.sector || sector,
        category,
        fields: row,
        mode: 'bulk_import',
        status: 'approved',
      })),
      skipDuplicates: true,
    });

    // Invalidate dup cache
    await redis.del(`dup:${clientId}:${category}`);

    res.json({ imported: created.count, fileName: req.file.originalname, format: req.file.originalname.split('.').pop() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getStats(req, res) {
  if (config.USE_MOCK_SERVICES) {
    return res.json(mockStore.getStats());
  }

  try {
    const [total, pending, approved, rejected, dups] = await Promise.all([
      prisma.registration.count(),
      prisma.registration.count({ where: { status: 'pending' } }),
      prisma.registration.count({ where: { status: 'approved' } }),
      prisma.registration.count({ where: { status: 'rejected' } }),
      prisma.registration.count({ where: { hasDuplicateWarning: true } }),
    ]);
    res.json({ total, pending, approved, rejected, duplicates: dups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateOthersPin(req, res) {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password too short' });
  }

  if (config.USE_MOCK_SERVICES) {
    mockStore.setOthersPin(newPassword);
    return res.json({ success: true });
  }
  
  try {
    await redis.set('others_pin', newPassword);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getSubmissions,
  updateSubmissionStatus,
  uploadImport,
  getStats,
  updateOthersPin
};
