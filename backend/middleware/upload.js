const multer = require("multer");
const { storage, avatarStorage } = require("../config/cloudinary");

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
module.exports.uploadAvatar = uploadAvatar;
