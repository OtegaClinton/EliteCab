const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Ensure the media folder exists
const mediaPath = path.join(__dirname, "media");
if (!fs.existsSync(mediaPath)) {
    fs.mkdirSync(mediaPath, { recursive: true });
}

// Define storage options
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "media");
        
        // Create folder dynamically if it does not exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname);
        const uniqueName = `profile_${Date.now()}${fileExtension}`;
        cb(null, uniqueName);
    }
});

// Define file filter function
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpg", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error("Only .jpg, .jpeg, and .png files are allowed"), false);
    }
    cb(null, true);
};

// Create the uploader with storage, file filter, and size limit options
const uploader = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 3 * 1024 * 1024, // 3MB file size limit
    }
});

module.exports = uploader;

