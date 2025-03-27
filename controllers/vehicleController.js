const Vehicle = require("../models/vehicleModel");
const uploader = require('../helpers/multer');
const cloudinary = require('../helpers/cloudinary');

// Add vehicle details
exports.addVehicle = async (req, res) => {
    try {
        uploader.single('vehicleImage')(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

        const { make, model, year, licensePlate } = req.body;
        const driverId = req.user.id;
        let vehicleImage = { pictureId: "", pictureUrl: "" };
        
                    if (req.file) {
                        // Upload image to Cloudinary
                        const result = await cloudinary.v2.uploader.upload(req.file.path, {
                            folder: 'vehicles',
                            use_filename: true,
                            unique_filename: false,
                        });
        
                        vehicleImage.pictureId = result.public_id; 
                        vehicleImage.pictureUrl = result.secure_url;
                    }
        

        const newVehicle = new Vehicle({
            driver: driverId,
            make,
            model,
            year,
            licensePlate,
            vehicleImage
        });
        await newVehicle.save();
        res.status(201).json({ message: "Vehicle added successfully", vehicle: newVehicle });
    });
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