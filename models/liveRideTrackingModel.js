const mongoose = require('mongoose');

const liveRideTrackingSchema = new mongoose.Schema({
  rideId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ride',
    required: true, 
    unique: true,
    index: true
  },
  driverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  status: { 
    type: String, 
    enum: ['in_progress', 'completed', 'canceled'],
    default: 'in_progress',
    index: true
  },
  passengers: [{
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'completed', 'canceled'],
      default: 'accepted' 
    },
    pickupLocation: {
      type: String,
      trim: true,
      required: true
    },
    dropoffLocation: {
      type: String,
      trim: true,
      required: true
    },
    endTime: Date
  }],
  locations: [{
    coordinates: {
      latitude: { 
        type: Number, 
        required: true,
        min: -90,
        max: 90
      },
      longitude: { 
        type: Number, 
        required: true,
        min: -180,
        max: 180
      }
    },
    timestamp: { 
      type: Date, 
      default: Date.now,
      index: true
    }
  }],
  startTime: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  endTime: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
liveRideTrackingSchema.index({ 'passengers.user': 1 });
liveRideTrackingSchema.index({ status: 1, startTime: -1 });

// Virtuals
liveRideTrackingSchema.virtual('activePassengers').get(function() {
  return this.passengers.filter(p => 
    ['pending', 'accepted'].includes(p.status)
  ).length;
});

// Pre-save validation
liveRideTrackingSchema.pre('save', function(next) {
  if (this.status === 'completed' && !this.endTime) {
    this.endTime = new Date();
  }
  
  if (this.locations.length > 0) {
    const lastLocation = this.locations[this.locations.length - 1];
    if (!lastLocation.timestamp) {
      lastLocation.timestamp = new Date();
    }
  }
  next();
});

const LiveRideTracking = mongoose.model('LiveRideTracking', liveRideTrackingSchema);

module.exports = LiveRideTracking;