const express = require("express");
const router = express.Router();
const {authenticator} = require("../middlewares/authentication");
const {authorization} = require("../middlewares/authorization");
const uploader = require("../helpers/multer");
const { 
    signUp,
    verifyEmail,
    newEmail,
    logIn,
    getUserById,
    getAllUsers,
    updateUser,
    deleteUser,
    makeAdmin,
    updateProfilePicture
   
 } = require("../controllers/userController");

 const { 
    changePassword, 
    forgotPassword, 
    resetPassword 
  } = require("../controllers/passwordController"); 

//signup route
router.post("/signup", signUp);

// Email verification route
router.get("/verify/:id/:token", verifyEmail);

// Resend verification email
router.post("/resend-verification", newEmail);

// Login route
router.post("/login", logIn);

// Get user by ID (Requires authentication)
router.get("/users/:id", authenticator, getUserById);

// Get all users (Admin only)
router.get("/users", authenticator, authorization, getAllUsers);

// Update user details (Requires authentication)
router.put("/users/:id", authenticator, uploader.single("profilePicture"), updateUser);

// Delete a user (Admin only)
router.delete("/users/:id", authenticator, authorization, deleteUser);

// Make a user an admin (Admin only)
router.put("/users/:id/make-admin", authenticator, authorization, makeAdmin);


// Route to update user profile picture
router.put('/profile-picture/:id', authenticator, uploader.single("profilePicture"), updateProfilePicture);


// password 
// Forgot password - send reset link to email
router.post("/forgot-password", forgotPassword);

// Reset password - update password using token
router.post("/reset-password/:token", resetPassword);

// Change password - user must be authenticated
router.post("/change-password", authenticator, changePassword);




module.exports = router;
