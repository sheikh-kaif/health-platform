const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage engine used by multer for prescription/report uploads.
// Accepts images and PDFs, tags each upload with a resource_type of "auto"
// so PDFs (raw) and images are both handled correctly.
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "health-platform/records",
    resource_type: "auto",
    allowed_formats: ["jpg", "jpeg", "png", "pdf", "webp"],
  },
});

// Separate storage engine for profile photos — own folder, image-only.
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "health-platform/avatars",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 512, height: 512, crop: "fill", gravity: "face" }],
  },
});

module.exports = { cloudinary, storage, avatarStorage };
