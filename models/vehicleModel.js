const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    make: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    licensePlate: {
        type: String,
        required: true,
        unique: true
    },
    vehicleImage: { 
        pictureId: { type: String, default: "" }, 
        pictureUrl: { type: String, default: "" }, 
      }, 
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
