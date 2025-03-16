const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstName: { 
      type: String, 
      required: true 
    },

    lastName: { 
      type: String, 
      required: true 
    },

    email: { 
      type: String, 
      required: true, 
      unique: true 
    },

    password: { 
      type: String, 
      required: true 
    },

    phoneNumber: { 
      type: String, 
      required: true 
    },

    role: { 
      type: String, 
      enum: ["driver", "passenger"], 
      required: true 
    },

    rides: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Ride" 
    }],

    isVerified: { 
      type: Boolean, 
      default: false 
    }
  }, 
  { timestamps: true }
);

const userModel = mongoose.model("User", UserSchema);

module.exports = userModel;
