const cloudinary = require('cloudinary');
require("dotenv").config();

const api_key = process.env.CLOUDINARY_API_KEY

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: api_key,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinary;