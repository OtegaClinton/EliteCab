const mongoose = require('mongoose');

const liveRideTrackingSchema = new mongoose.Schema({
  rideId: { type: String, required: true, unique: true },
  driverId: { type: String, required: true },
  userId: { type: String, required: true },
  status: { type: String, enum: ['started', 'ended'], default: 'started' },
  locations: [
    {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const LiveRideTracking = mongoose.model('LiveRideTracking', liveRideTrackingSchema);

module.exports = LiveRideTracking;