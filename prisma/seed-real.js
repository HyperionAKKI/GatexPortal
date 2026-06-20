// prisma/seed-real.js
// Seeds the GatexPortal database with REAL IRS student data (NO images)
// Images from the old Cloudinary system are intentionally excluded.
// Run: node prisma/seed-real.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ─── CSV PARSER ────────────────────────────────────────────────────────────────
function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (values[i] || '').trim(); });
    return obj;
  }).filter(r => r.id);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── DETECT BRANCH → CLIENT ID ────────────────────────────────────────────────
function detectBranch(schoolName) {
  const s = (schoolName || '').toLowerCase();
  if (s.includes('maharajganj') || s.includes('maharjganj')) return 'cl-irs-maharajganj';
  if (s.includes('nichlaul') || s.includes('nichaul'))       return 'cl-irs-nichlaul';
  if (s.includes('nausad') || s.includes('naushad'))         return 'cl-irs-nausad';
  if (s.includes('medical'))                                  return 'cl-irs-medical';
  if (s.includes('prime'))                                    return 'cl-irs-prime';
  if (s.includes('taramandal') || s.includes(' tm') || s.includes(',tm')) return 'cl-irs-tm';
  if (s.includes('the irs'))                                  return 'cl-irs-main';
  return 'cl-irs-main';
}

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
const clients = [
  { id: 'cl-irs-tm',          name: 'The IRS Taramandal',             sector: 'school', gateId: 'GX-SCH-IRS-TM',   logoKey: null, logoColor: '#2563eb' },
  { id: 'cl-irs-maharajganj', name: 'The IRS Maharajganj',            sector: 'school', gateId: 'GX-SCH-IRS-MHGJ', logoKey: null, logoColor: '#059669' },
  { id: 'cl-irs-nichlaul',    name: 'The IRS Nichlaul',               sector: 'school', gateId: 'GX-SCH-IRS-NCH',  logoKey: null, logoColor: '#7c3aed' },
  { id: 'cl-irs-nausad',      name: 'The IRS Nausad',                 sector: 'school', gateId: 'GX-SCH-IRS-NSD',  logoKey: null, logoColor: '#d97706' },
  { id: 'cl-irs-medical',     name: 'The IRS Medical',                sector: 'school', gateId: 'GX-SCH-IRS-MED',  logoKey: null, logoColor: '#dc2626' },
  { id: 'cl-irs-prime',       name: 'The IRS Prime',                  sector: 'school', gateId: 'GX-SCH-IRS-PRM',  logoKey: null, logoColor: '#0284c7' },
  { id: 'cl-irs-main',        name: 'The Indian Revolutionary School',sector: 'school', gateId: 'GX-SCH-IRS-MAIN', logoKey: null, logoColor: '#16a34a' },
];

// ─── SUBMISSION ID ────────────────────────────────────────────────────────────
function makeSubmissionId(index) {
  return `GATEX-REG-${String(index + 100000).slice(-6)}`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  GateX Portal — Real Data Seeder (Students Only)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. Seed Clients
  console.log('\n[1/3] Seeding IRS branch clients...');
  for (const client of clients) {
    await prisma.client.upsert({
      where:  { gateId: client.gateId },
      update: { name: client.name },
      create: client,
    });
  }
  console.log(`      ✓ ${clients.length} clients seeded`);

  // 2. Load students CSV
  console.log('\n[2/3] Loading students CSV...');
  const possiblePaths = [
    '/var/www/gatex-portal/data/students_rows.csv',           // AWS server path
    path.join(__dirname, '..', 'data', 'students_rows.csv'),  // local fallback
    '/tmp/students_rows.csv',
  ];

  let studentsPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) { studentsPath = p; break; }
  }

  if (!studentsPath) {
    throw new Error(
      '\n  ❌ students_rows.csv not found!\n' +
      '  → Copy it to the server at: GatexPortal/data/students_rows.csv\n' +
      '  → Then run this script again.\n'
    );
  }

  const students = parseCSV(studentsPath);
  console.log(`      ✓ Loaded ${students.length} student records from: ${studentsPath}`);

  // 3. Seed Registrations (students only, no images)
  console.log('\n[3/3] Seeding student registrations...');
  let regCount  = 0;
  let skipCount = 0;

  for (let i = 0; i < students.length; i++) {
    const s = students[i];

    // Skip blank/test rows
    if (!s.id || !s.name || s.name.toLowerCase() === 'asdasd' || s.name.toLowerCase() === 'jhon doe') {
      skipCount++;
      continue;
    }

    const clientId     = detectBranch(s.school_name);
    const submissionId = makeSubmissionId(i);

    try {
      await prisma.registration.upsert({
        where:  { submissionId },
        update: {},
        create: {
          submissionId,
          clientId,
          sector:   'school',
          category: 'Student',
          fields: {
            name:       s.name,
            rollNumber: s.roll_number,
            school:     s.school_name,
          },
          mode:      'excel_import',
          status:    'approved',    // all records are considered approved
          createdAt: new Date(s.created_at),
          updatedAt: new Date(s.created_at),
        },
      });
      regCount++;
    } catch (err) {
      console.error(`      ✗ Error on "${s.name}" (${s.id}): ${err.message}`);
    }

    if ((i + 1) % 100 === 0 || i === students.length - 1) {
      process.stdout.write(`\r      ↳ ${i + 1}/${students.length} processed...`);
    }
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Seeding Complete!');
  console.log(`     Clients created:        ${clients.length}`);
  console.log(`     Registrations seeded:   ${regCount}`);
  console.log(`     Skipped (test/invalid): ${skipCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
