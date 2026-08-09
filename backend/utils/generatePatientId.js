const { customAlphabet } = require("nanoid");

const nanoid = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

function generatePatientId() {
  return `PAT-${nanoid()}`;
}

module.exports = generatePatientId;
