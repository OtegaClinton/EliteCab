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

    username: {  
      type: String, 
      required: true, 
      unique: true 
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

    gender: { 
      type: String, 
      enum: ["male", "female", "others", "prefer not to say"], 
      default: "prefer not to say" 
    },

    role: { 
      type: String, 
      enum: ["driver", "passenger"], 
      required: true 
    },

    isAdmin: { 
      type: Boolean, 
      default: false 
    },

    rides: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Ride" 
    }],

    isVerified: { 
      type: Boolean, 
      default: false 
    },

    profilePicture: { 
      pictureId: { type: String, default: "" }, 
      pictureUrl: { type: String, default: "" } 
    }, 

   location: { 
    type: String, 
    required: true
   },

    ratings: { 
      type: Number, 
      default: 0, 
      min: 0, 
      max: 5 
    }, 
  }, 
  { timestamps: true }
);

const userModel = mongoose.model("User", UserSchema);

module.exports = userModel;
