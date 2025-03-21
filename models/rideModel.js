const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema(
  {
    driver: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

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
      min: 1 
    },

    passengers: [{ 
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'approved'], default: 'pending' }
    }],

    status: { 
      type: String, 
      enum: ["open", "full", "completed"], 
      default: "open" 
    }
  }, 
  { timestamps: true }
);

const rideModel = mongoose.model("Ride", RideSchema);

module.exports = rideModel;
