// server/services/s3.service.js
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config');

function buildMockImageUrl(label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#0f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#e2e8f0" font-family="Arial" font-size="24">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

if (config.USE_MOCK_SERVICES) {
  async function uploadToS3(buffer, key) {
    return key;
  }

  async function getSignedImageUrl(key) {
    return buildMockImageUrl(key.split('/').pop() || 'GateX Mock Image');
  }

  module.exports = {
    uploadToS3,
    getSignedImageUrl,
  };
  return;
}

const s3 = new S3Client({
  region: config.AWS.REGION,
  credentials: {
    accessKeyId: config.AWS.ACCESS_KEY_ID,
    secretAccessKey: config.AWS.SECRET_ACCESS_KEY,
  },
});

async function uploadToS3(buffer, key, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: config.AWS.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  }));
  return key;
}

async function getSignedImageUrl(key) {
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: config.AWS.S3_BUCKET,
    Key: key,
  }), { expiresIn: 3600 });
}

module.exports = {
  uploadToS3,
  getSignedImageUrl
};
