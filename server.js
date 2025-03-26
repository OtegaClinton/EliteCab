require('./controllers/paymentController');
require("dotenv").config();
const express = require("express");
const axios = require('axios');
const multer = require("multer");
const cors = require('cors');
const paypal = require("@paypal/checkout-server-sdk");
require("./config/db"); 
const userRoutes = require("./routes/userRoute");
const chatRoutes = require("./routes/chatRoute");
const rideRoutes = require("./routes/rideRoute"); 
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');


const http = require('http');
const liveRideTrackingRoutes = require('./routes/liveRideTrackingRoute');
const { getRoute } = require("./utils/osmHelper"); 
const socketConnect = require('./sockets/socketConnection');
// const socketConnect = require('./sockets/socketConnection');
const rateLimit = require("express-rate-limit"); // Rate Limiting for the APIs

const PORT = process.env.PORT || 2025;
const app = express();
const server = http.createServer(app);
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests, please try again later.",
  });

app.use(cors()); 
app.use(express.json());


app.use("/api/v1", userRoutes, chatRoutes, rideRoutes);
app.use('/api/live-ride-tracking', limiter, liveRideTrackingRoutes);
app.use('/payment', paymentRoutes); // Payment API routes
app.use('/ride', reviewRoutes); // Review API routes

// Initialize Socket.IO
socketConnect.init(server);

// Configure PayPal environment
const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const client = new paypal.core.PayPalHttpClient(environment);

// Route to create a PayPal payment order
app.post("/api/paypal/create-payment", async (req, res) => {
  const { amount, currency } = req.body;

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency || "USD",
          value: amount,
        },
      },
    ],
  });

  try {
    const response = await client.execute(request);
    res.json({ id: response.result.id });
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    res.status(500).json({ error: "Payment creation failed" });
  }
});

// Route to capture a PayPal payment
app.post("/api/paypal/capture-payment", async (req, res) => {
  const { orderID } = req.body;

  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});

  try {
    const response = await client.execute(request);
    res.json({ status: response.result.status, details: response.result });
  } catch (error) {
    console.error("Error capturing PayPal payment:", error);
    res.status(500).json({ error: "Payment capture failed" });
  }
});

// Webhook to handle PayPal payment status updates
app.post("/api/paypal/webhook", async (req, res) => {
  const event = req.body;
  console.log("Webhook Event: ", event);

  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    console.log("Payment Successful: ", event.resource);
    // Here, update the ride status in your database
  }

  res.sendStatus(200);
});


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


server.listen(PORT, () => {
    console.log(`🚀 Server is listening on PORT: ${PORT}`);
});

