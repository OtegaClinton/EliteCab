const Ride = require("../models/rideModel");
const { getRoute } = require("../utils/osmHelper"); 
const socketIO = require('../sockets/socketConnection');


// Create a ride (Driver only, with OSM Helper)
exports.createRide = async (req, res) => {
    try {
     const { from, to, availableSeats } = req.body;
        const driverId = req.user.id;
    
        // Fetch route details using OSM
            const routeDetails = await getRoute(from, to);

         // Convert distance to kilometers (as a number)
         const distanceKm = (routeDetails.distance / 1000).toFixed(2); // 2 decimal places
       
         // Convert duration to total minutes (as a number)
         const durationInMinutes = Math.floor(routeDetails.duration / 60); // Convert seconds to minutes
 
         // Create a new ride
         const newRide = new Ride({
             driver: driverId,
             from,
             to,
             availableSeats,
             passengers: [],
             distance: parseFloat(distanceKm), // Ensure it's stored as a number
             duration: durationInMinutes, // Store duration in minutes as a number
         });
         await newRide.save();
         res.status(201).json({ 
            message: "Ride created successfully", 
            ride: {
                ...newRide.toObject(), 
                formattedDuration: `${Math.floor(durationInMinutes / 60)}h ${durationInMinutes % 60}m`
            }
        })  
    } catch (error) {
    console.error("Error creating ride:", error);
    res.status(500).json({ error: "Error creating ride" });
    }
};

exports.addReview = (req, res) => {
    try {
        const { userId, rideId, rating, comment } = req.body;

        if (!userId || !rideId || !rating) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Simulating saving to a database (Replace this with actual DB logic)
        const newReview = {
            userId,
            rideId,
            rating,
            comment,
            createdAt: new Date(),
        };

        res.status(201).json({ message: "Review added successfully", review: newReview });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
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
        const ride = await Ride.findById(req.params.id);
        
        // Check if the ride exists
        if (!ride) {
            return res.status(404).json({ error: "Ride not found" });
        }
        
        // Check if the logged-in user is the driver
        if (ride.driver.toString() !== req.user.id.toString()) {
            return res.status(403).json({ error: "You are not authorized to Update Ride details" });
        }
       
       const updatedRide = await Ride.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ message: "Ride updated successfully", ride: updatedRide });
    } catch (error) {
        res.status(500).json({ error: "Error updating ride" });
    }
};

// Cancel a ride
exports.deleteRide = async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id);
        
        // Check if the ride exists
        if (!ride) {
            return res.status(404).json({ error: "Ride not found" });
        }

        // Check if the logged-in user is the driver
        if (ride.driver.toString() !== req.user.id.toString()) {
            return res.status(403).json({ error: "You are not authorized to cancel this ride" });
        }

        // Proceed with deleting the ride
        await Ride.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Ride cancelled successfully" });
    } catch (error) {
        console.log(error);  // Log the error to help debug
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

         // Check if no rides are found
         if (availableRides.length === 0) {
            return res.status(200).json({ message: "No available rides now" });
        }

        res.status(200).json(availableRides);
    } catch (error) {
        console.error("Error fetching available rides:", error);
        res.status(500).json({ error: "Error fetching available rides" });
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

exports.joinRide = async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id);
        if (!ride) return res.status(404).json({ error: "Ride not found" });

        if (ride.availableSeats < 1) {
            return res.status(400).json({ error: "No more available seats" });
        }

        // Check if passenger already exists in any status
        const existingPassenger = ride.passengers.find(p => 
            p.user.toString() === req.user.id.toString()
        );

        if (existingPassenger) {
            return res.status(400).json({ 
                error: "You have already requested to join this ride",
                currentStatus: existingPassenger.status
            });
        }

        // Add properly structured passenger
        ride.passengers.push({
            user: req.user.id,
            status: "pending",
            pickupLocation: req.body.pickupLocation || ride.from, // Add if needed
            requestedAt: new Date()
        });

        await ride.save();
        res.status(200).json({ message: "Ride request sent successfully", ride });
    } catch (error) {
        res.status(500).json({ error: "Error joining ride" });
    }
};

exports.handleRideRequest = async (req, res) => {
    try {
        const { status } = req.body;
        const ride = await Ride.findById(req.params.id)
            .populate('passengers.user', 'name email phone'); // Populate passenger info

        if (!ride) {
            return res.status(404).json({ error: "Ride not found" });
        }

        // Find the passenger request using either _id or user id
        const passengerRequest = ride.passengers.find(p => 
            p._id.toString() === req.params.requestId || 
            p.user._id.toString() === req.params.requestId
        );

        if (!passengerRequest) {
            return res.status(404).json({ error: "Passenger request not found" });
        }

        if (status === "accepted") {
            if (ride.availableSeats < 1) {
                return res.status(400).json({ error: "No more available seats" });
            }
            
            passengerRequest.status = "accepted";
            passengerRequest.approvedAt = new Date();
            ride.availableSeats -= 1;
            
            // Notify passenger via WebSocket
            socketIO.getIO().to(`user_${passengerRequest.user._id}`).emit('rideRequestAccepted', {
                rideId: ride._id,
                driverId: ride.driver,
                status: 'accepted'
            });
        } else if (status === "rejected") {
            passengerRequest.status = "rejected";
            // Optionally remove from array if you want to clean up
            // ride.passengers = ride.passengers.filter(p => p._id.toString() !== req.params.requestId);
        } else {
            return res.status(400).json({ error: "Invalid status" });
        }

        await ride.save();

        res.status(200).json({ 
            message: `Passenger request ${status}`, 
            ride: {
                _id: ride._id,
                availableSeats: ride.availableSeats,
                passengers: ride.passengers.map(p => ({
                    _id: p._id,
                    user: p.user._id,
                    status: p.status,
                    approvedAt: p.approvedAt
                }))
            }
        });
    } catch (error) {
        console.error("Error handling ride request:", error);
        res.status(500).json({ 
            error: "Error handling ride request",
            details: error.message 
        });
    }
};