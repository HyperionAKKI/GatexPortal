// server/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { adminMiddleware } = require('../middleware/auth');
const { importUpload } = require('../middleware/upload');

// All admin routes are protected by adminMiddleware
router.use(adminMiddleware);

router.get('/submissions', adminController.getSubmissions);
router.patch('/submissions/:id', adminController.updateSubmissionStatus);
router.post('/upload-import', importUpload.single('file'), adminController.uploadImport);
router.get('/stats', adminController.getStats);
router.post('/others-pin', adminController.updateOthersPin);

module.exports = router;
