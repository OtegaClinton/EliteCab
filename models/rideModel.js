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
      min: 1 
    },

    status: { 
      type: String, 
      enum: ["open", "full", "completed"], 
      default: "open",
    },
  }, 
  { timestamps: true }
);



const rideModel = mongoose.model("Ride", RideSchema);

module.exports = rideModel;
