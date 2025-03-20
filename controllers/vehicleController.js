const Vehicle = require("../models/vehicleModel");

// Add vehicle details
exports.addVehicle = async (req, res) => {
    try {
        const { make, model, year, licensePlate } = req.body;
        const driverId = req.user.id;

        const newVehicle = new Vehicle({
            driver: driverId,
            make,
            model,
            year,
            licensePlate
        });
        await newVehicle.save();
        res.status(201).json({ message: "Vehicle added successfully", vehicle: newVehicle });
    } catch (error) {
        res.status(500).json({ error: "Error adding vehicle" });
    }
};

// Update vehicle details
exports.updateVehicle = async (req, res) => {
    try {
        const updatedVehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ message: "Vehicle updated successfully", vehicle: updatedVehicle });
    } catch (error) {
        res.status(500).json({ error: "Error updating vehicle" });
    }
};