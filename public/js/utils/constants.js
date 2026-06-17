export const SECTORS = [
  { id: 'school', name: 'School', icon: '🏫', desc: 'Schools, academies, and campus registration desks' },
  { id: 'college', name: 'College', icon: '🎓', desc: 'Colleges, universities, and higher education institutions' },
  { id: 'office', name: 'Office', icon: '🏢', desc: 'Corporate offices, departments, and operational teams' },
  { id: 'showroom', name: 'Showroom', icon: '🏪', desc: 'Retail showrooms, counters, and sales floors' },
  { id: 'clinic', name: 'Clinic', icon: '🏥', desc: 'Clinics, hospitals, and patient service centers' },
  { id: 'factory', name: 'Factory', icon: '🏭', desc: 'Manufacturing floors, plants, and industrial operations' },
];

export const CATEGORIES = {
  school: ['Student', 'Teacher', 'Management', 'Non-teaching', 'Parent', 'Object', 'Others'],
  college: ['Student', 'Professor', 'Management', 'Non-teaching', 'Parent / Guardian', 'Object', 'Others'],
  office: ['Employee', 'Management', 'HR', 'IT Support', 'Reception', 'Security', 'Visitor', 'Object', 'Others'],
  showroom: ['Employee', 'Management', 'Sales Associate', 'Cashier', 'Floor Manager', 'Service Advisor', 'Visitor', 'Object', 'Others'],
  clinic: ['Patient', 'Doctor', 'Employee', 'Patient Guardian', 'Management', 'Object', 'Others'],
  factory: ['Worker', 'Employee', 'Management', 'Visitor', 'Object', 'Others'],
};

export const ANGLES = [
  { name: 'Front', icon: '😐', desc: 'Look directly into the camera' },
  { name: 'Slight Left', icon: '👈', desc: 'Turn slightly to the left' },
  { name: 'Slight Right', icon: '👉', desc: 'Turn slightly to the right' },
  { name: 'Slight Up', icon: '👆', desc: 'Lift the chin slightly' },
  { name: 'Slight Down', icon: '👇', desc: 'Lower the chin slightly' },
];

export const CLIENTS_DB = [
  { id: 'cl001', name: 'Sunrise Public School', sector: 'school', logo: 'SPS', color: 'brand-sky', gateId: 'GX-SCH-001', shortLabel: 'School ID' },
  { id: 'cl002', name: 'Greenfield College', sector: 'college', logo: 'GFC', color: 'brand-teal', gateId: 'GX-COL-002', shortLabel: 'College ID' },
  { id: 'cl003', name: 'TechCorp Ltd', sector: 'office', logo: 'TC', color: 'brand-ink', gateId: 'GX-OFF-003', shortLabel: 'Office ID' },
  { id: 'cl004', name: 'AutoElite Showroom', sector: 'showroom', logo: 'AE', color: 'brand-amber', gateId: 'GX-SHW-004', shortLabel: 'Showroom ID' },
  { id: 'cl005', name: 'City Medical Clinic', sector: 'clinic', logo: 'CMC', color: 'brand-red', gateId: 'GX-CLN-005', shortLabel: 'Clinic ID' },
  { id: 'cl006', name: 'Bharat Industries', sector: 'factory', logo: 'BI', color: 'brand-blue', gateId: 'GX-FAC-006', shortLabel: 'Factory ID' },
];

export const EXISTING_RECORDS = [
  // School - Student
  { sector: 'school', category: 'Student', name: 'Aryan Sharma', class: '8', section: 'B', roll: '14', father: 'Rajesh Sharma', mobile: '9876543210' },
  { sector: 'school', category: 'Student', name: 'Priya Singh', class: '10', section: 'A', roll: '21', father: 'Vikram Singh', mobile: '9812345678' },
  { sector: 'school', category: 'Student', name: 'Rohan Mehta', class: '12', section: 'C', roll: '45', father: 'Sanjay Mehta', mobile: '9922334455' },
  
  // School - Teacher
  { sector: 'school', category: 'Teacher', name: 'Suresh Kumar', mobile: '9823456789', role: 'Mathematics Teacher', referenceId: 'T-101' },
  { sector: 'school', category: 'Teacher', name: 'Meenakshi Iyer', mobile: '9834567890', role: 'Science Teacher', referenceId: 'T-102' },

  // College - Student
  { sector: 'college', category: 'Student', name: 'Kabir Malhotra', mobile: '9845678901', role: 'B.Tech CS - Year 3', referenceId: 'ST-2021-09' },
  { sector: 'college', category: 'Student', name: 'Ananya Goel', mobile: '9856789012', role: 'B.Sc Physics - Year 2', referenceId: 'ST-2022-14' },

  // College - Professor
  { sector: 'college', category: 'Professor', name: 'Dr. Amit Verma', mobile: '9867890123', role: 'Head of Physics Dept.', referenceId: 'P-501' },
  
  // Office - Employee
  { sector: 'office', category: 'Employee', name: 'Neha Gupta', mobile: '9812345678', role: 'Senior Software Engineer', referenceId: 'EMP-204' },
  { sector: 'office', category: 'Employee', name: 'Vikram Malhotra', mobile: '9823456701', role: 'Product Manager', referenceId: 'EMP-105' },

  // Office - HR
  { sector: 'office', category: 'HR', name: 'Shalini Sen', mobile: '9834567123', role: 'HR Manager', referenceId: 'HR-02' },

  // Office - Reception
  { sector: 'office', category: 'Reception', name: 'Aarti Sharma', mobile: '9845678234', role: 'Front Desk Executive', referenceId: 'REC-01' },

  // Office - Management
  { sector: 'office', category: 'Management', name: 'Rajiv Bajaj', mobile: '9856789345', role: 'Director of Operations', referenceId: 'MNG-01' },

  // Showroom - Employee
  { sector: 'showroom', category: 'Employee', name: 'Karan Johar', mobile: '9867890456', role: 'Senior Sales Consultant', referenceId: 'SR-101' },

  // Showroom - Sales Associate
  { sector: 'showroom', category: 'Sales Associate', name: 'Riya Sen', mobile: '9876543567', role: 'Sales Specialist', referenceId: 'SA-204' },

  // Showroom - Cashier
  { sector: 'showroom', category: 'Cashier', name: 'Deepak Chawla', mobile: '9887654678', role: 'Chief Cashier', referenceId: 'CASH-05' },

  // Clinic - Patient
  { sector: 'clinic', category: 'Patient', name: 'Ramesh Kumar', mobile: '9922334455', guardian: 'Sita Kumar' },
  { sector: 'clinic', category: 'Patient', name: 'Sunita Devi', mobile: '9933445566', guardian: 'Rakesh Devi' },

  // Clinic - Doctor
  { sector: 'clinic', category: 'Doctor', name: 'Dr. Sanjay Gupta', mobile: '9898765789', role: 'Consulting Cardiologist', referenceId: 'DOC-12' },

  // Factory - Worker
  { sector: 'factory', category: 'Worker', name: 'Suresh Patel', mobile: '9818273645', role: 'Line Assembly Operator', referenceId: 'WRK-405' },
  { sector: 'factory', category: 'Worker', name: 'Madan Lal', mobile: '9828374656', role: 'Quality Control Inspector', referenceId: 'WRK-302' },

  // Factory - Employee
  { sector: 'factory', category: 'Employee', name: 'Jaspal Singh', mobile: '9838475667', role: 'Floor Manager', referenceId: 'F-EMP-88' },
];

export const MOCK_SUBMISSIONS = [
  { id: 'GATEX-REG-AB12CD', clientId: 'cl001', sector: 'school', client: 'Sunrise Public School', cat: 'Student', name: 'Aryan Sharma', status: 'pending', dup: true, date: '2026-06-03' },
  { id: 'GATEX-REG-XY89ZW', clientId: 'cl003', sector: 'office', client: 'TechCorp Ltd', cat: 'Employee', name: 'Neha Gupta', status: 'approved', dup: false, date: '2026-06-02' },
  { id: 'GATEX-REG-QR56MN', clientId: 'cl005', sector: 'clinic', client: 'City Medical Clinic', cat: 'Patient', name: 'Ramesh Kumar', status: 'pending', dup: false, date: '2026-06-02' },
  { id: 'GATEX-REG-LK34PQ', clientId: 'cl006', sector: 'factory', client: 'Bharat Industries', cat: 'Worker', name: 'Suresh Patel', status: 'rejected', dup: false, date: '2026-06-01' },
  { id: 'GATEX-REG-EF22GH', clientId: 'cl002', sector: 'college', client: 'Greenfield College', cat: 'Student', name: 'Priya Singh', status: 'approved', dup: true, date: '2026-06-01' },
];

export const SECTOR_COPY = {
  school: {
    entityLabel: 'School',
    entityIdLabel: 'School ID',
    entityPlural: 'schools',
    searchPlaceholder: 'Search school name or School ID',
    selectHeading: 'Select School',
    selectSubheading: 'Choose the school campus where this record belongs.',
    detailsHeading: 'Enter School Registration Details',
    detailsSubheading: 'Use school-first fields such as class, section, roll number, and guardian details.',
  },
  college: {
    entityLabel: 'College',
    entityIdLabel: 'College ID',
    entityPlural: 'colleges',
    searchPlaceholder: 'Search college name or College ID',
    selectHeading: 'Select College',
    selectSubheading: 'Choose the college or university unit for this record.',
    detailsHeading: 'Enter College Registration Details',
    detailsSubheading: 'Capture student, professor, and campus administration records cleanly.',
  },
  office: {
    entityLabel: 'Office',
    entityIdLabel: 'Office ID',
    entityPlural: 'offices',
    searchPlaceholder: 'Search office name or Office ID',
    selectHeading: 'Select Office',
    selectSubheading: 'Choose the office or branch for this entry.',
    detailsHeading: 'Enter Office Registration Details',
    detailsSubheading: 'Capture employees, management, and operational visitors with role-based clarity.',
  },
  showroom: {
    entityLabel: 'Showroom',
    entityIdLabel: 'Showroom ID',
    entityPlural: 'showrooms',
    searchPlaceholder: 'Search showroom name or Showroom ID',
    selectHeading: 'Select Showroom',
    selectSubheading: 'Choose the showroom location for this entry.',
    detailsHeading: 'Enter Showroom Registration Details',
    detailsSubheading: 'Capture showroom staff, management, and visitors with a clean retail workflow.',
  },
  clinic: {
    entityLabel: 'Clinic',
    entityIdLabel: 'Clinic ID',
    entityPlural: 'clinics',
    searchPlaceholder: 'Search clinic name or Clinic ID',
    selectHeading: 'Select Clinic',
    selectSubheading: 'Choose the clinic or medical unit for this entry.',
    detailsHeading: 'Enter Clinic Registration Details',
    detailsSubheading: 'Capture patients, guardians, doctors, and employees accurately.',
  },
  factory: {
    entityLabel: 'Factory',
    entityIdLabel: 'Factory ID',
    entityPlural: 'factories',
    searchPlaceholder: 'Search factory name or Factory ID',
    selectHeading: 'Select Factory',
    selectSubheading: 'Choose the plant or industrial unit for this record.',
    detailsHeading: 'Enter Factory Registration Details',
    detailsSubheading: 'Capture workers, employees, and management records with shift-ready data.',
  },
};
