// server/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/admin', authController.adminLogin);
router.post('/others-pin', authController.verifyOthersPin);

module.exports = router;
