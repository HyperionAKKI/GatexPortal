const { randomUUID } = require('crypto');
const { genSubmissionId } = require('./helpers');

const clients = [
  { id: 'cl001', name: 'Sunrise Public School', sector: 'school', gateId: 'GX-SCH-001', logoKey: null, logoColor: '#2563eb' },
  { id: 'cl002', name: 'Greenfield College', sector: 'college', gateId: 'GX-COL-002', logoKey: null, logoColor: '#059669' },
  { id: 'cl003', name: 'TechCorp Ltd', sector: 'office', gateId: 'GX-OFF-003', logoKey: null, logoColor: '#7c3aed' },
  { id: 'cl004', name: 'AutoElite Showroom', sector: 'showroom', gateId: 'GX-SHW-004', logoKey: null, logoColor: '#d97706' },
  { id: 'cl005', name: 'City Medical Clinic', sector: 'clinic', gateId: 'GX-CLN-005', logoKey: null, logoColor: '#dc2626' },
  { id: 'cl006', name: 'Bharat Industries', sector: 'factory', gateId: 'GX-FAC-006', logoKey: null, logoColor: '#0284c7' },
];

const registrations = [
  {
    id: randomUUID(),
    submissionId: 'GATEX-REG-AB12CD',
    clientId: 'cl001',
    sector: 'school',
    category: 'Student',
    fields: { name: 'Aryan Sharma', class: '8', section: 'B', roll: '14', father: 'Rajesh Sharma', mobile: '9876543210' },
    mode: 'manual',
    status: 'pending',
    hasDuplicateWarning: true,
    duplicateRef: null,
    reviewedAt: null,
    createdAt: new Date('2026-06-03T09:00:00.000Z'),
    updatedAt: new Date('2026-06-03T09:00:00.000Z'),
    images: [],
  },
  {
    id: randomUUID(),
    submissionId: 'GATEX-REG-XY89ZW',
    clientId: 'cl003',
    sector: 'office',
    category: 'Employee',
    fields: { name: 'Neha Gupta', employeeId: 'EMP-204', mobile: '9812345678' },
    mode: 'existing',
    status: 'approved',
    hasDuplicateWarning: false,
    duplicateRef: null,
    reviewedAt: new Date('2026-06-02T10:00:00.000Z'),
    createdAt: new Date('2026-06-02T09:00:00.000Z'),
    updatedAt: new Date('2026-06-02T10:00:00.000Z'),
    images: [],
  },
  {
    id: randomUUID(),
    submissionId: 'GATEX-REG-QR56MN',
    clientId: 'cl005',
    sector: 'clinic',
    category: 'Patient',
    fields: { name: 'Ramesh Kumar', mobile: '9922334455' },
    mode: 'manual',
    status: 'pending',
    hasDuplicateWarning: false,
    duplicateRef: null,
    reviewedAt: null,
    createdAt: new Date('2026-06-02T11:00:00.000Z'),
    updatedAt: new Date('2026-06-02T11:00:00.000Z'),
    images: [],
  },
];

let othersPin = null;

function listClients({ sector, search, gateId } = {}) {
  return clients.filter((client) => {
    if (sector && client.sector !== sector) return false;
    if (gateId && client.gateId !== gateId) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!client.name.toLowerCase().includes(q) && !client.gateId.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });
}

function getClientById(id) {
  return clients.find((client) => client.id === id) || null;
}

function listRegistrations(filters = {}) {
  const { clientId, category, status, q, approvedOnly, sector } = filters;
  return registrations.filter((registration) => {
    if (sector && registration.sector !== sector) return false;
    if (clientId && registration.clientId !== clientId) return false;
    if (category && registration.category !== category) return false;
    if (status && registration.status !== status) return false;
    if (approvedOnly && registration.status !== 'approved') return false;
    if (q) {
      const name = String(registration.fields?.name || '').toLowerCase();
      if (!name.includes(String(q).toLowerCase())) return false;
    }
    return true;
  });
}

function getRegistrationByIdOrSubmissionId(id) {
  return registrations.find((registration) => registration.id === id || registration.submissionId === id) || null;
}

function createRegistration({ clientId, sector, category, fields, mode, hasDuplicateWarning, duplicateRef }) {
  const now = new Date();
  const registration = {
    id: randomUUID(),
    submissionId: genSubmissionId(),
    clientId,
    sector,
    category,
    fields,
    mode: mode || 'manual',
    status: 'pending',
    hasDuplicateWarning: !!hasDuplicateWarning,
    duplicateRef: duplicateRef || null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    images: [],
  };

  registrations.unshift(registration);
  return registration;
}

function addImage(registrationId, { angleIndex, angleName, s3Key, fileSize }) {
  const registration = getRegistrationByIdOrSubmissionId(registrationId);
  if (!registration) return null;

  const image = {
    id: randomUUID(),
    registrationId,
    s3Key,
    angleIndex: angleIndex ?? null,
    angleName: angleName || 'object',
    approved: true,
    fileSize,
    createdAt: new Date(),
  };

  registration.images.push(image);
  registration.updatedAt = new Date();
  return image;
}

function updateRegistrationStatus(id, status) {
  const registration = registrations.find((item) => item.id === id || item.submissionId === id);
  if (!registration) return null;

  registration.status = status;
  registration.reviewedAt = new Date();
  registration.updatedAt = new Date();
  return registration;
}

function importRegistrations(rows, { clientId, category, sector }) {
  let count = 0;
  for (const row of rows) {
    const now = new Date();
    registrations.unshift({
      id: randomUUID(),
      submissionId: genSubmissionId(),
      clientId,
      sector: row.sector || sector || '',
      category,
      fields: row,
      mode: 'bulk_import',
      status: 'approved',
      hasDuplicateWarning: false,
      duplicateRef: null,
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
      images: [],
    });
    count += 1;
  }
  return count;
}

function getStats() {
  return {
    total: registrations.length,
    pending: registrations.filter((item) => item.status === 'pending').length,
    approved: registrations.filter((item) => item.status === 'approved').length,
    rejected: registrations.filter((item) => item.status === 'rejected').length,
    duplicates: registrations.filter((item) => item.hasDuplicateWarning).length,
  };
}

function getOthersPin() {
  return othersPin;
}

function setOthersPin(pin) {
  othersPin = pin;
}

module.exports = {
  addImage,
  createRegistration,
  getClientById,
  getOthersPin,
  getRegistrationByIdOrSubmissionId,
  getStats,
  importRegistrations,
  listClients,
  listRegistrations,
  setOthersPin,
  updateRegistrationStatus,
};
