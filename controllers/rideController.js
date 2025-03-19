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
