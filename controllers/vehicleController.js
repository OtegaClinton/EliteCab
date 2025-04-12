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

            if (!req.file) {
                return res.status(400).json({ error: "Vehicle image is required." });
            }

            const { make, model, year, licensePlate } = req.body;
            const driverId = req.user.id;

            // Check if vehicle with the same license plate already exists
            const existingVehicle = await Vehicle.findOne({ licensePlate });
            if (existingVehicle) {
                return res.status(409).json({ error: "A vehicle with this license plate already exists." });
            }

            // Upload image to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'vehicles',
                use_filename: true,
                unique_filename: false,
            });

            const vehicleImage = {
                pictureId: result.public_id,
                pictureUrl: result.secure_url,
            };

            const newVehicle = new Vehicle({
                driver: driverId,
                make,
                model,
                year,
                licensePlate,
                vehicleImage,
            });

            await newVehicle.save();
            res.status(201).json({ message: "🚗 Vehicle added successfully", vehicle: newVehicle });
        });
    } catch (error) {
        res.status(500).json({ error: error.message || "An error occurred while adding the vehicle." });
    }
};


// Update vehicle details
exports.updateVehicle = async (req, res) => {
    uploader.single('vehicleImage')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        try {
            const { make, model, year, licensePlate } = req.body;

            // Ensure an image is provided during update
            if (!req.file) {
                return res.status(400).json({ error: "Vehicle image is required for update." });
            }

            // Upload image to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'vehicles',
                use_filename: true,
                unique_filename: false,
            });

            const vehicleImage = {
                pictureId: result.public_id,
                pictureUrl: result.secure_url,
            };

            // Check if the vehicle exists
            const vehicle = await Vehicle.findById(req.params.id);
            if (!vehicle) {
                return res.status(404).json({ error: "Vehicle not found." });
            }

            // Ensure the new licensePlate is unique
            if (licensePlate && licensePlate !== vehicle.licensePlate) {
                const existingVehicle = await Vehicle.findOne({ licensePlate });
                if (existingVehicle) {
                    return res.status(409).json({ error: "A vehicle with this license plate already exists." });
                }
            }

            // Update the vehicle
            const updatedVehicle = await Vehicle.findByIdAndUpdate(
                req.params.id,
                { make, model, year, licensePlate, vehicleImage },
                { new: true, runValidators: true }
            );

            res.status(200).json({ message: "🚗 Vehicle updated successfully", vehicle: updatedVehicle });

        } catch (error) {
            //console.error("Update Vehicle Error:", error); // Logs detailed error in terminal
            res.status(500).json({ error: error.message || "An error occurred while updating the vehicle." });
        }
    });
};