const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
require("dotenv").config();


exports.authorization = async (req, res, next) => {
    try {
        // Extract token from headers
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided. Authorization denied." });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user by ID
        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if the user is an Admin or Super Admin
        if (!user.isAdmin && !user.isSuperAdmin) {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }

        req.user = user; // Attach user to request
        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired. Please login again." });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid token. Authorization denied." });
        }
        res.status(500).json({ message: "Server error: " + error.message });
    }
};

