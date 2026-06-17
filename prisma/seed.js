// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  },
  {
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
  },
  {
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
  },
];

async function main() {
  console.log('Seeding clients...');
  for (const client of clients) {
    await prisma.client.upsert({
      where: { gateId: client.gateId },
      update: {},
      create: client,
    });
  }

  console.log('Seeding registrations...');
  for (const reg of registrations) {
    await prisma.registration.upsert({
      where: { submissionId: reg.submissionId },
      update: {},
      create: reg,
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
