// server/lib/helpers.js

function genSubmissionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GATEX-REG-${id}`;
}

module.exports = {
  genSubmissionId
};
