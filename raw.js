// routes/rideRoute.js
const express = require("express");
const router = express.Router();
const { authenticator } = require("../middlewares/authentication");
const { createRide, getDriverRides, updateRide, deleteRide, getRideRequests, handleRideRequest, getAvailableRides, joinRide, getRideHistory } = require("../controllers/rideController");
const { addVehicle, updateVehicle } = require("../controllers/vehicleController");

// Drivers create a ride
router.post("/api/rides", authenticator, createRide);

// Get all rides offered by the current driver
router.get("/api/rides/driver", authenticator, getDriverRides);

// Update ride details
router.put("/api/rides/:id", authenticator, updateRide);

// Cancel a ride
router.delete("/api/rides/:id", authenticator, deleteRide);

// Get passenger requests for a ride
router.get("/api/rides/:id/requests", authenticator, getRideRequests);

// Accept or reject a passenger request
router.put("/api/rides/:id/requests/:requestId", authenticator, handleRideRequest);

// Passengers find available rides (Dynamic location, using Google Maps API)
router.get("/api/rides", getAvailableRides);

// Passengers join a ride
router.post("/api/rides/:id/join", authenticator, joinRide);

// Users see their ride history
router.get("/api/rides/history", authenticator, getRideHistory);

// Vehicles
router.post("/api/vehicles", authenticator, addVehicle);
router.put("/api/vehicles/:id", authenticator, updateVehicle);

module.exports = router;


// controllers/rideController.js
const Ride = require("../models/rideModel");
const { getRouteDetails } = require("../utils/googleMapsHelper");

// Create a ride (Driver only, with Google Maps integration)
exports.createRide = async (req, res) => {
    try {
        const { from, to, availableSeats } = req.body;
        const driverId = req.user.id;
        const routeDetails = await getRouteDetails(from, to);
        
        const newRide = new Ride({
            driver: driverId,
            from: routeDetails.startAddress,
            to: routeDetails.endAddress,
            availableSeats,
            passengers: []
        });
        await newRide.save();
        res.status(201).json({ message: "Ride created successfully", ride: newRide });
    } catch (error) {
        res.status(500).json({ error: "Error creating ride" });
    }
};

// Get all rides offered by the current driver
exports.getDriverRides = async (req, res) => {
    try {
        const rides = await Ride.find({ driver: req.user.id });
        res.status(200).json(rides);
    } catch (error) {
        res.status(500).json({ error: "Error fetching rides" });
    }
};

// Update ride details
exports.updateRide = async (req, res) => {
    try {
        const ride = await Ride.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ message: "Ride updated successfully", ride });
    } catch (error) {
        res.status(500).json({ error: "Error updating ride" });
    }
};

// Cancel a ride
exports.deleteRide = async (req, res) => {
    try {
        await Ride.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Ride cancelled successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error cancelling ride" });
    }
};

// Get passenger requests for a ride
exports.getRideRequests = async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id).populate("passengers");
        res.status(200).json(ride.passengers);
    } catch (error) {
        res.status(500).json({ error: "Error fetching ride requests" });
    }
};

// Accept or reject a passenger request
exports.handleRideRequest = async (req, res) => {
    try {
        const { status } = req.body; // Accept or Reject
        const ride = await Ride.findById(req.params.id);
        
        if (!ride) return res.status(404).json({ error: "Ride not found" });
        
        const passengerIndex = ride.passengers.findIndex(p => p.toString() === req.params.requestId);
        if (passengerIndex === -1) return res.status(404).json({ error: "Passenger request not found" });
        
        if (status === "accepted") {
            ride.passengers[passengerIndex].status = "accepted";
        } else {
            ride.passengers.splice(passengerIndex, 1); // Remove rejected request
        }
        await ride.save();
        res.status(200).json({ message: `Passenger request ${status}`, ride });
    } catch (error) {
        res.status(500).json({ error: "Error handling ride request" });
    }
};


// controllers/vehicleController.js
const Vehicle = require("../models/vehicleModel");

// Add vehicle details
exports.addVehicle = async (req, res) => {
    try {
        const { make, model, year, licensePlate } = req.body;
        const driverId = req.user.id;

        const newVehicle = new Vehicle({
            driver: driverId,
            make,
            model,
            year,
            licensePlate
        });
        await newVehicle.save();
        res.status(201).json({ message: "Vehicle added successfully", vehicle: newVehicle });
    } catch (error) {
        res.status(500).json({ error: "Error adding vehicle" });
    }
};

// Update vehicle details
exports.updateVehicle = async (req, res) => {
    try {
        const updatedVehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ message: "Vehicle updated successfully", vehicle: updatedVehicle });
    } catch (error) {
        res.status(500).json({ error: "Error updating vehicle" });
    }
};


// utils/googleMapsHelper.js
const axios = require("axios");
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Get route details using Google Maps API
exports.getRouteDetails = async (from, to) => {
    try {
        const response = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
            params: {
                origin: from,
                destination: to,
                key: GOOGLE_MAPS_API_KEY
            }
        });
        
        if (response.data.status !== "OK") throw new Error("Invalid route");
        
        return {
            startAddress: response.data.routes[0].legs[0].start_address,
            endAddress: response.data.routes[0].legs[0].end_address,
            distance: response.data.routes[0].legs[0].distance.text,
            duration: response.data.routes[0].legs[0].duration.text
        };
    } catch (error) {
        throw new Error("Error fetching route details");
    }
};


// models/vehicleModel.js
const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    make: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    licensePlate: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Vehicle", vehicleSchema);




// models/chatModel.js
const chatSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Chat", chatSchema);


// controllers/chatController.js
const Chat = require("../models/chatModel");

// Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { receiver, message } = req.body;
        const sender = req.user.id;

        const newMessage = new Chat({ sender, receiver, message });
        await newMessage.save();

        res.status(201).json({ message: "Message sent successfully", chat: newMessage });
    } catch (error) {
        res.status(500).json({ error: "Error sending message" });
    }
};

// Get chat history between two users
exports.getChatHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUser = req.user.id;

        const chatHistory = await Chat.find({
            $or: [
                { sender: currentUser, receiver: userId },
                { sender: userId, receiver: currentUser }
            ]
        }).sort({ timestamp: 1 });

        res.status(200).json(chatHistory);
    } catch (error) {
        res.status(500).json({ error: "Error fetching chat history" });
    }
};


// routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const { authenticator } = require("../middlewares/authentication");
const { sendMessage, getChatHistory } = require("../controllers/chatController");

router.post("/chat", authenticator, sendMessage);
router.get("/chat/:userId", authenticator, getChatHistory);

module.exports = router;
