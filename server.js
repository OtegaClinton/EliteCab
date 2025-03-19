require("dotenv").config();
const express = require("express");
const multer = require("multer");
require("./config/db"); 
const userRoutes = require("./routes/userRoute");
const http = require('http');
const liveRideTrackingRoutes = require('./routes/liveRideTrackingRoute');
const socketConnect = require('./sockets/socketConnection');
const rateLimit = require("express-rate-limit"); // Rate Limiting for the APIs

const PORT = process.env.PORT || 2025;
const app = express();
const server = http.createServer(app);
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests, please try again later.",
  });

app.use(express.json());

app.use("/api/v1", userRoutes);
app.use('/api/live-ride-tracking', limiter, liveRideTrackingRoutes);

// Socket.io connection
socketConnect(server);

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        // Handle JSON parsing error
        return res.status(400).json({ error: 'Invalid JSON format. Please check your request body.' });
    } else if (err instanceof multer.MulterError) {
        // Handle specific Multer file upload errors
        switch (err.code) {
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({ message: 'You can only upload one profile picture.' });
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({ message: 'Profile picture size exceeds the 3MB limit.' });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({ message: 'Only one image file is allowed (.jpg, .jpeg, .png).' });
            default:
                return res.status(400).json({ message: err.message });
        }
    } else if (err.message === 'Only .jpg, .jpeg, and .png files are allowed') {
        return res.status(400).json({ message: 'Invalid file type. Only .jpg, .jpeg, and .png images are allowed.' });
    } else if (err) {
        // Handle other unknown errors
        return res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }

    next();
});


app.listen(PORT, () => {
    console.log(`🚀 Server is listening on PORT: ${PORT}`);
});
