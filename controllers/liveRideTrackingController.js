const LiveRideTracking = require('../models/liveRideTrackingModel'); // Updated model

// Start a ride
exports.startRide = async (req, res) => {
  try {
    const { rideId, driverId, userId } = req.body;

    // Save ride details to the database
    const ride = await LiveRideTracking.create({ rideId, driverId, userId, status: 'started' });

    res.status(201).json({
      status: 'success',
      data: { ride },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// End a ride
exports.endRide = async (req, res) => {
  try {
    const { rideId } = req.body;

    // Update ride status in the database
    const ride = await LiveRideTracking.findOneAndUpdate(
      { rideId },
      { status: 'ended' },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      data: { ride },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};