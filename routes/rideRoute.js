const express = require("express");
const router = express.Router();
const axios = require('axios');
const { authenticator } = require("../middlewares/authentication");
const { getRoute } = require("../utils/osmHelper"); 
const { 
    createRide, 
    getDriverRides, 
    updateRide, 
    deleteRide, 
    getRideRequests, 
    handleRideRequest, 
    getAvailableRides, 
    joinRide, 
    getRideHistory 
} = require("../controllers/rideController");

const { addVehicle, updateVehicle } = require("../controllers/vehicleController");

// Drivers create a ride
router.post("/rides", authenticator, createRide);

// Get all rides offered by the current driver
router.get("/rides/driver", authenticator, getDriverRides);

// Update ride details
router.put("/rides/:id", authenticator, updateRide);

// Cancel a ride
router.delete("/rides/:id", authenticator, deleteRide);

// Get passenger requests for a ride
router.get("/rides/:id/requests", authenticator, getRideRequests);

// Accept or reject a passenger request
router.put("/rides/:id/requests/:requestId", authenticator, handleRideRequest);

// Passengers find available rides (Dynamic location, using Open Street Maps)
router.get("/rides/available", getAvailableRides);

// Passengers join a ride
router.post("/rides/:id/join", authenticator, joinRide);

// Users see their ride history
router.get("/rides/history", authenticator, getRideHistory);

// Vehicles
router.post("/vehicles", authenticator, addVehicle);
router.put("/vehicles/:id/update", authenticator, updateVehicle);

module.exports = router;