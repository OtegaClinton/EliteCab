const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
require("dotenv").config();

exports.authenticator = async (req, res, next) => {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided or invalid token format. Authorization denied." });
    }

    const token = authHeader.split(" ")[1];

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user data to request object
    req.user = decoded; // Now accessible in controllers

    next(); // Proceed to the next middleware/controller

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired. Please login again." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid token. Authentication failed." });
    }

    console.error("Authentication Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
