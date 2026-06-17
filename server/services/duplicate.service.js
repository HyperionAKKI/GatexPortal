// server/services/duplicate.service.js
const config = require('../config');
const mockStore = require('../lib/mockStore');
const prisma = require('../lib/prisma');
const redis = require('./redis.service');

async function checkDuplicate(clientId, category, fields) {
  if (config.USE_MOCK_SERVICES) {
    const records = mockStore.listRegistrations({ clientId, category });
    return findDuplicate(records, fields);
  }

  const cacheKey = `dup:${clientId}:${category}`;
  let existing = await redis.get(cacheKey);

  if (!existing) {
    const records = await prisma.registration.findMany({
      where: { clientId, category },
      select: { id: true, fields: true, submissionId: true },
    });
    existing = JSON.stringify(records);
    await redis.setex(cacheKey, 300, existing); // 5 min cache
  }

  const records = JSON.parse(existing);
  return findDuplicate(records, fields);
}

function findDuplicate(records, fields) {
  if (!records.length) return null;

  const name = fields.name?.toLowerCase();
  if (!name) return null;

  for (const record of records) {
    const rf = record.fields;
    if (rf.name?.toLowerCase() !== name) continue;

    // Field match percentage
    const keys = Object.keys({ ...fields, ...rf });
    let matches = 0;
    for (const k of keys) {
      if (fields[k] && rf[k] && String(fields[k]).toLowerCase() === String(rf[k]).toLowerCase()) {
        matches++;
      }
    }
    const score = Math.round((matches / keys.length) * 100);
    if (score >= 80) {
      return { submissionId: record.submissionId, score, matchedName: rf.name };
    }
  }
  return null;
}

module.exports = {
  checkDuplicate
};
