// server/routes/registration.routes.js
const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registration.controller');
const { authMiddleware } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');

router.get('/search', authMiddleware, registrationController.searchRegistrations);
router.post('/check-duplicate', registrationController.checkDuplicateRegistration);
router.post('/', registrationController.createRegistration);
router.post('/:id/images', imageUpload.array('images', 10), registrationController.uploadImages);
router.get('/:id', registrationController.getRegistrationDetails);

module.exports = router;
