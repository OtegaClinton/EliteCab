require("dotenv").config();
const express = require("express");
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
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests, please try again later.",
  });

app.use(express.json());

app.use("/api/v1", userRoutes);
app.use('/api/live-ride-tracking', limiter, liveRideTrackingRoutes);

// Socket.io connection
socketConnect(server);

app.listen(PORT, () => {
    console.log(`🚀 Server is listening on PORT: ${PORT}`);
});
