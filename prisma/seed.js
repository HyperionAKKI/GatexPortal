// prisma/seed.js
require('dotenv').config();
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

async function main() {
  console.log('Seeding clients...');
  for (const client of clients) {
    await prisma.client.upsert({
      where: { gateId: client.gateId },
      update: {},
      create: client,
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
