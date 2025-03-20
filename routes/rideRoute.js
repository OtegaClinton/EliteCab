const express = require("express");
const router = express.Router();
const { authenticator } = require("../middlewares/authentication");
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