// server/controllers/client.controller.js
const config = require('../config');
const mockStore = require('../lib/mockStore');
const prisma = require('../lib/prisma');
const s3Service = require('../services/s3.service');

async function getClients(req, res) {
  const { sector, search, gateId } = req.query;
  if (config.USE_MOCK_SERVICES) {
    return res.json(mockStore.listClients({ sector, search, gateId }));
  }

  const where = {};
  if (sector) where.sector = sector;
  if (gateId) where.gateId = gateId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { gateId: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  try {
    const clients = await prisma.client.findMany({ 
      where, 
      select: { 
        id: true, 
        name: true, 
        gateId: true, 
        sector: true, 
        logoKey: true, 
        logoColor: true 
      } 
    });

    // Add signed URLs for logos
    const result = await Promise.all(clients.map(async c => ({
      ...c,
      logoUrl: c.logoKey ? await s3Service.getSignedImageUrl(c.logoKey) : null,
    })));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getClientById(req, res) {
  if (config.USE_MOCK_SERVICES) {
    const client = mockStore.getClientById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    return res.json(client);
  }

  try {
    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (client.logoKey) {
      client.logoUrl = await s3Service.getSignedImageUrl(client.logoKey);
    }
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getClients,
  getClientById
};
