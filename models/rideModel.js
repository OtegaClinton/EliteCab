const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema(
  {
    driver: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    pricePerSeat: { 
      type: Number, 
      required: true 
    },

    maxPassengers: { 
      type: Number, 
      required: true
     },

  currentPassengers: {
     type: Number, default: 0
     },

  passengers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
   }],

    from: { 
      type: String, 
      required: true, 
      trim: true 
    },

    to: { 
      type: String, 
      required: true, 
      trim: true 
    },

    availableSeats: { 
      type: Number, 
      required: true, 
      min: 0
    },

    status: { 
      type: String, 
      enum: ["open", "full", "completed"], 
      default: "open",
    },
    // passengers: [{ 
    //   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    //   status: { type: String, enum: ['pending', 'approved'], default: 'pending' }
    // }],

    passengers: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { 
            type: String, 
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
        requestedAt: { type: Date, default: Date.now },
        approvedAt: Date, // Track when request was approved
        pickupLocation: {type: String, trim: true},
        dropoffLocation: {type: String, trim: true}
    }],

    status: { 
      type: String, 
      enum: ["open", "full", "completed"], 
      default: "open" 
    },
    distance: {
      type: Number,
      required: true
  },
    duration: {
      type: Number,
      required: true
  }, 
  }, 
  { timestamps: true }
);



const rideModel = mongoose.model("Ride", RideSchema);

module.exports = rideModel;