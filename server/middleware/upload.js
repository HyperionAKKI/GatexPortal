// server/middleware/upload.js
const multer = require('multer');

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ];
    const fileName = String(file.originalname || '').toLowerCase();
    const allowedExtension = ['.csv', '.xls', '.xlsx'].some((ext) => fileName.endsWith(ext));
    cb(null, allowed.includes(file.mimetype) || allowedExtension);
  },
});

module.exports = {
  imageUpload,
  importUpload,
};
