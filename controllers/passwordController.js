require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const sendEmail = require('../helpers/email');
const resetPasswordhtml = require('../helpers/html');

// Password regex: Ensures at least one uppercase letter, one special character, no consecutive special characters, and minimum 6 characters
const passwordPattern = /^(?!.*[\W_]{2})(?=.*[A-Z])(?=.*[\W_]).{6,}$/;

const changePassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    // Verify the JWT token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.id;

    // Find the user by their ID
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the old password is correct
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(400).json({ message: 'Invalid old password' });
    }

    // Validate new password format
    if (!passwordPattern.test(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be at least 6 characters long, contain at least one uppercase letter, one special character, and no consecutive special characters.',
      });
    }

    // Validate that the new password and confirm new password match
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: 'New password and confirm new password do not match' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email format
        if (!email || typeof email !== "string" || !email.trim()) {
            return res.status(400).json({ message: "Valid email is required." });
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        // Find user by email
        const user = await userModel.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: 'User with this email does not exist.' });
        }

        const firstName = user.firstName; // Match your model correctly

        // Generate a JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Construct the password reset link (Ensure this matches your frontend URL)
        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

        // Generate HTML email content (Fix the parameter order)
        const emailContent = resetPasswordhtml(resetLink, firstName);
        const emailSubject = 'Password Reset Request';

        // Set up email options
        const mailOptions = {
            from: process.env.MAIL_USER, // Ensure this matches your environment variable
            to: user.email,
            subject: emailSubject,
            html: emailContent
        };

        // Send the email
        await sendEmail(mailOptions);

        res.status(200).json({
            message: 'Password reset email sent successfully. Check your inbox.',
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: "An error occurred. Please try again later." });
    }
};


const resetPassword = async (req, res) => {
  try {
      const { token } = req.params;
      const { newPassword, confirmNewPassword } = req.body;

      // Validate passwords
      if (!newPassword || !confirmNewPassword) {
          return res.status(400).json({
              message: "Both new password and confirmation are required.",
          });
      }

      if (newPassword !== confirmNewPassword) {
          return res.status(400).json({
              message: "New password and confirmation do not match.",
          });
      }

      // Validate password format
      const passwordPattern = /^(?!.*[\W_]{2})(?=.*[A-Z])(?=.*[\W_]).{6,}$/;
      if (!passwordPattern.test(newPassword)) {
          return res.status(400).json({
              message: "Password must be at least 6 characters long, contain one uppercase letter, and at least one special character.",
          });
      }

      // Verify token
      let decodedToken;
      try {
          decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
          return res.status(401).json({ message: "Invalid or expired token." });
      }

      // Find user by ID
      const user = await userModel.findById(decodedToken.userId);
      if (!user) {
          return res.status(404).json({ message: "User not found." });
      }

      // Prevent resetting to the current password
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
          return res.status(400).json({ message: "New password must be different from the current password." });
      }

      // Hash and update the password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      res.status(200).json({ message: "Password reset successful." });

  } catch (error) {
      console.error("Reset Password Error:", error);
      res.status(500).json({ message: "An error occurred. Please try again later." });
  }
};

  

module.exports = {changePassword, forgotPassword, resetPassword};
