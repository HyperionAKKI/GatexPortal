// server/routes/client.routes.js
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');

router.get('/', clientController.getClients);
router.get('/:id', clientController.getClientById);

module.exports = router;
