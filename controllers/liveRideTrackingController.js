const LiveRideTracking = require('../models/liveRideTrackingModel');
const socketIO = require('../sockets/socketConnection'); // Import Socket.IO instance

// Start a ride
exports.startRide = async (req, res) => {
  try {
    const { rideId, driverId, userId } = req.body;

    // Check if the ride already exists
    const existingRide = await LiveRideTracking.findOne({ rideId });
    if (existingRide) {
      return res.status(400).json({ message: 'Ride already started.' });
    }

    // Create a new ride record
    const newRide = new LiveRideTracking({
      rideId,
      driverId,
      userId,
      status: 'started',
      locations: [], // Empty array for now
    });

    await newRide.save();

    // Emit the startRide event
    socketIO.getIO().emit('startRide', { rideId, driverId, userId });

    res.status(201).json({ message: 'Ride started successfully.', ride: newRide });
  } catch (error) {
    console.error('Error starting ride:', error);
    res.status(500).json({ message: 'An error occurred while starting the ride.' });
  }
};

// End a ride
exports.endRide = async (req, res) => {
  try {
    const { rideId, driverId, userId } = req.body;

    // Find and update the ride
    const ride = await LiveRideTracking.findOneAndUpdate(
      { rideId },
      { status: 'ended' },
      { new: true }
    );

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    // Emit the endRide event
    socketIO.getIO().emit('endRide', { rideId, driverId, userId });

    res.status(200).json({ message: 'Ride ended successfully.', ride });
  } catch (error) {
    console.error('Error ending ride:', error);
    res.status(500).json({ message: 'An error occurred while ending the ride.' });
  }
};

// Update location (real-time)
exports.updateLocation = async (req, res) => {
  try {
    const { rideId, latitude, longitude } = req.body;

    // Find the ride by rideId
    const ride = await LiveRideTracking.findOne({ rideId });
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    // Add the new location to the locations array
    ride.locations.push({ latitude, longitude });
    await ride.save();

    // Emit the updateLocation event
    socketIO.getIO().emit('updateLocation', { rideId, latitude, longitude });

    res.status(200).json({ message: 'Location updated successfully.', ride });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'An error occurred while updating the location.' });
  }
};