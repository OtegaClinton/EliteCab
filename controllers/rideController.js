const Ride = require("../models/rideModel");
const { getRoute } = require("../utils/osmHelper"); 

// Create a ride (Driver only, with OSM Helper)
exports.createRide = async (req, res) => {
    try {
        const { from, to, availableSeats } = req.body;
        const driverId = req.user.id;

        // Fetch route details using OSM
        const routeDetails = await getRoute(from, to);
        console.log(from, to)
        // Create a new ride
        const newRide = new Ride({
            driver: driverId,
            from,
            to,
            availableSeats,
            passengers: [],
            distance: routeDetails.distance,
            duration: routeDetails.duration
        });

        await newRide.save();
        res.status(201).json({ message: "Ride created successfully", ride: newRide });
    } catch (error) {
        console.error(error);
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

// Passengers find available rides
exports.getAvailableRides = async (req, res) => {
    try {
        const { from, to } = req.query; 

        if (!from || !to) {
            return res.status(400).json({ error: "Both 'from' and 'to' locations are required" });
        }

        // Find rides that match the "from" and "to" locations
        const availableRides = await Ride.find({
            from: { $regex: from, $options: "i" }, // Case-insensitive search
            to: { $regex: to, $options: "i" },
            availableSeats: { $gt: 0 } // Ensure there are available seats
        }).populate("driver", "name vehicle"); // Populate driver details

        res.status(200).json(availableRides);
    } catch (error) {
        console.error("Error fetching available rides:", error);
        res.status(500).json({ error: "Error fetching available rides" });
    }
};


// Passengers join a ride
exports.joinRide = async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id);

        if (!ride) return res.status(404).json({ error: "Ride not found" });

        if (ride.availableSeats <= 0) return res.status(400).json({ error: "No available seats" });

        // Check if passenger is already in the ride request list
        if (ride.passengers.includes(req.user.id)) {
            return res.status(400).json({ error: "You have already requested to join this ride" });
        }

        // Add passenger to the ride request list (pending status)
        ride.passengers.push({ user: req.user.id, status: "pending" });
        await ride.save();

        res.status(200).json({ message: "Ride request sent successfully", ride });
    } catch (error) {
        res.status(500).json({ error: "Error joining ride" });
    }
};

// Users see their ride history
exports.getRideHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch rides where user is either a driver or an accepted passenger
        const rideHistory = await Ride.find({
            $or: [
                { driver: userId },
                { "passengers.user": userId, "passengers.status": "accepted" }
            ]
        });

        res.status(200).json(rideHistory);
    } catch (error) {
        res.status(500).json({ error: "Error fetching ride history" });
    }
};
