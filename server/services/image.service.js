// server/services/image.service.js

/**
 * Validates whether an image meets criteria for approval.
 * @param {Buffer} buffer 
 * @param {number|null} angleIndex 
 */
async function approveImage(buffer, angleIndex) {
  // Minimum size check
  if (buffer.length < 5000) {
    return { approved: false, reason: 'Image too small' };
  }
  // Simulate approval (in prod: call CV/face detection API)
  return { approved: true };
}

module.exports = {
  approveImage
};
