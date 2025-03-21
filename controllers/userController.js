const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const userModel = require("../models/userModel");
const sendMail = require("../helpers/email");
const cloudinary = require("../helpers/cloudinary");
const fs = require("fs");
const path = require("path");


exports.signUp = async (req, res) => {
  try {
    let {
      firstName = '',
      lastName = '',
      username = '',
      email = '',
      password = '',
      confirmPassword = '',
      phoneNumber = '',
      gender = '',
      role = '',
      location = ''
    } = req.body;

    // Check for missing or empty fields
    if (!firstName.trim()) return res.status(400).json({ message: 'First name is required.' });
    if (!lastName.trim()) return res.status(400).json({ message: 'Last name is required.' });
    if (!username.trim()) return res.status(400).json({ message: 'Username is required.' });
    if (!email.trim()) return res.status(400).json({ message: 'Email is required.' });
    if (!password) return res.status(400).json({ message: 'Password is required.' });
    if (!confirmPassword) return res.status(400).json({ message: 'Confirm password is required.' });
    if (!phoneNumber.trim()) return res.status(400).json({ message: 'Phone number is required.' });
    if (!gender.trim()) return res.status(400).json({ message: 'Gender is required.' });
    if (!role.trim()) return res.status(400).json({ message: 'Role is required.' });
    if (!location.trim()) return res.status(400).json({ message: 'Location is required.' });

    // Trim and sanitize input
    firstName = firstName.trim();
    lastName = lastName.trim();
    username = username.trim();
    email = email.trim().toLowerCase();
    phoneNumber = phoneNumber.trim();
    gender = gender.trim().toLowerCase();
    role = role.trim().toLowerCase();
    location = location.trim();

    // Define regex patterns
    const namePattern = /^[A-Za-z]{3,}(?: [A-Za-z]+)*$/;
    const usernamePattern = /^[a-zA-Z0-9_]{3,}$/;
    const passwordPattern = /^(?=.*[A-Z])(?=.*[\W_]).{6,}$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneNumberPattern = /^\d{11}$/;
    
    // Validate input
    if (!namePattern.test(firstName)) return res.status(400).json({ message: 'First name must be at least 3 letters and contain only alphabets.' });
    if (!namePattern.test(lastName)) return res.status(400).json({ message: 'Last name must be at least 3 letters and contain only alphabets.' });
    if (!usernamePattern.test(username)) return res.status(400).json({ message: 'Username must be at least 3 characters long and can only contain letters, numbers, and underscores.' });
    if (!emailPattern.test(email)) return res.status(400).json({ message: 'Invalid email format.' });
    if (!passwordPattern.test(password)) return res.status(400).json({ message: 'Password must be at least 6 characters, contain an uppercase letter, and a special character.' });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' });
    if (!phoneNumberPattern.test(phoneNumber)) return res.status(400).json({ message: 'Phone number must be exactly 11 digits.' });

    // Ensure gender and role are valid
    const validGenders = ["male", "female", "others", "prefer not to say"];
    const validRoles = ["driver", "passenger"];

    if (!validGenders.includes(gender)) return res.status(400).json({ 
      message: `Invalid gender value. Allowed values are: ${validGenders.join(', ')}.` 
    });
    if (!validRoles.includes(role)) return res.status(400).json({ 
      message:`Invalid role value. Allowed values are: ${validRoles.join(', ')}.` 
    });

    // Check if user already exists
    const existingUser = await userModel.findOne({ $or: [{ email }, { username }, { phoneNumber }] });

    if (existingUser) {
      if (existingUser.email === email) return res.status(400).json({ message: 'This email is already registered.' });
      if (existingUser.username === username) return res.status(400).json({ message: 'This username is already taken.' });
      if (existingUser.phoneNumber === phoneNumber) return res.status(400).json({ message: 'This phone number is already registered.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new userModel({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      phoneNumber,
      gender,
      role,
      location,
      isAdmin: false,
      isVerified: false
    });

    // Save the user to the database
    await newUser.save();

    // Generate a JWT token
    const userToken = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Construct the verification link
    const verifyLink = `${req.protocol}://${req.get('host')}/api/v1/verify/${newUser._id}/${userToken}`;

    // Generate email template for Elite Cab
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 10px;">
        <h2 style="color: #007bff;">🚖 Welcome to Elite Cab, ${newUser.firstName}! 🚖</h2>
        <p style="color: #333; font-size: 16px;">
          Your journey with Elite Cab starts here! To book or offer rides, please verify your email.
        </p>
        <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; font-size: 18px; 
          background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
          ✅ Verify Your Email
        </a>
        <p style="color: #555; font-size: 14px;">
          If you didn’t sign up for Elite Cab, ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #777; font-size: 14px;">
          &copy; ${new Date().getFullYear()} Elite Cab. Drive smart, ride safe.
        </p>
      </div>
    `;

    // Send verification email
    await sendMail({
      subject: 'Kindly verify your email.',
      to: newUser.email,
      html: emailTemplate
    });

    res.status(201).json({
      message: 'Account created successfully. Please check your email to verify your account.',
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        gender: newUser.gender,
        role: newUser.role,
        location: newUser.location,
        isVerified: newUser.isVerified
      }
    });

  } catch (error) {
    console.error('Error during sign-up:', error);

    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email, username, or phone number already in use.' });
    }

    res.status(500).json({ message: 'An error occurred during sign-up.' });
  }
};

  


  exports.verifyEmail = async (req, res) => {
    try {
      const { id, token } = req.params;
  
      // Find the user by ID
      const findUser = await userModel.findById(id);
      if (!findUser) {
        return res.status(404).json({ message: "User not found." });
      }
  
      // If already verified, notify user
      if (findUser.isVerified) {
        return res.status(200).json({ message: "Your account has already been verified." });
      }
  
      // Verify the token
      try {
        jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        // If token is expired, send a new verification email
        const newToken = jwt.sign({ id: findUser._id, email: findUser.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
        const verifyLink = `${req.protocol}://${req.get("host")}/api/v1/verify/${findUser._id}/${newToken}`;
  
        await sendMail({
          subject: "Verify Your Elite Cab Account",
          to: findUser.email,
          html: `
            <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
              <h2 style="color: #007bff;">🚖 Hello, ${findUser.firstName}! 🚖</h2>
              <p>Oops! Your previous verification link has expired. But don’t worry, we've got a new one just for you!</p>
              <p>Click the button below to verify your email and start enjoying Elite Cab services.</p>
              <a href="${verifyLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px; display: inline-block;">
                ✅ Verify My Email
              </a>
              <p>If you did not sign up for Elite Cab, you can ignore this email.</p>
            </div>
          `,
        });
  
        return res.status(400).json({
          message: "This link has expired. A new verification link has been sent to your email.",
        });
      }
  
      // Mark user as verified
      findUser.isVerified = true;
      await findUser.save();
  
      // Redirect URL after successful verification
      const redirectUrl = "https://elite-cab.vercel.app/#/Login";
      const successPage = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verified - Elite Cab</title>
          <style>
              body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; text-align: center; padding: 50px; }
              .container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); display: inline-block; }
              h2 { color: #007bff; }
              p { font-size: 16px; color: #333; }
              a { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; font-size: 16px; }
          </style>
      </head>
      <body>
          <div class="container">
              <h2>🎉 Welcome to Elite Cab, ${findUser.firstName}! 🚖</h2>
              <p>Your email has been verified! You’re now ready to book and offer rides.</p>
              <p>You will be redirected to the login page in <span id="countdown">10</span> seconds.</p>
              <a href="${redirectUrl}">Go to Login 🚗</a>
          </div>
  
          <script>
              let countdown = 10;
              const countdownElement = document.getElementById('countdown');
              setInterval(() => {
                  if (countdown > 0) {
                      countdown--;
                      countdownElement.textContent = countdown;
                  } else {
                      window.location.href = "${redirectUrl}";
                  }
              }, 1000);
          </script>
      </body>
      </html>`;
  
      res.status(200).send(successPage);
    } catch (error) {
      console.error("Error during email verification:", error);
      return res.status(500).json({ message: "An error occurred during verification." });
    }
  };

  
  exports.newEmail = async (req, res) => {
    try {
      const { email } = req.body;
  
      // Ensure email is provided
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
  
      // Normalize email (convert to lowercase)
      const normalizedEmail = email.toLowerCase();
  
      // Find the user by email
      const user = await userModel.findOne({ email: normalizedEmail });
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Generate a new JWT token
      const userToken = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "24h" } // Token valid for 24 hours
      );
  
      // Create the verification link
      const reverifyLink = `${req.protocol}://${req.get("host")}/api/v1/verify/${user._id}/${userToken}`;
  
      // Elite Cab-themed email HTML
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification - Elite Cab</title>
            <style>
                body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; text-align: center; padding: 50px; }
                .container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); display: inline-block; }
                h2 { color: #007bff; font-size: 24px; }
                p { font-size: 16px; color: #333; }
                .verify-button {
                    display: inline-block;
                    padding: 12px 25px;
                    background-color: #007bff;
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 18px;
                    margin-top: 20px;
                    transition: 0.3s ease-in-out;
                }
                .verify-button:hover {
                    background-color: #0056b3;
                    transform: scale(1.05);
                }
                .footer {
                    margin-top: 20px;
                    font-size: 14px;
                    color: #888;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🚖 Verify Your Elite Cab Account 🚖</h2>
                <p>Hello ${user.firstName},</p>
                <p>Your previous verification link has expired. Click the button below to verify your email and start booking and offering rides with Elite Cab! 🚗</p>
                <a href="${reverifyLink}" class="verify-button">✅ Verify My Email</a>
                <p class="footer">&copy; ${new Date().getFullYear()} Elite Cab. Drive smart, ride safe.</p>
            </div>
        </body>
        </html>
      `;
  
      // Send the email
      await sendMail({
        subject: "Verify Your Email Again - Elite Cab 🚖",
        to: user.email,
        html: emailHtml,
      });
  
      // Response
      res.status(200).json({
        message: "A new verification email has been sent. Please check your inbox.",
      });
  
    } catch (error) {
      console.error("Error sending verification email:", error);
      res.status(500).json({ message: "An error occurred while sending the email." });
    }
  };


  exports.logIn = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Validate input
      if (!email || typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ message: "Valid email is required." });
      }
      if (!password || typeof password !== "string" || password.trim().length < 6) {
        return res.status(400).json({ message: "Password is required." });
      }
  
      // Normalize email
      const normalizedEmail = email.trim().toLowerCase();
  
      // Find user by email
      const user = await userModel.findOne({ email: normalizedEmail });
  
      // Generic error message to prevent enumeration attacks
      if (!user) {
        return res.status(400).json({ message: "Incorrect email or password." });
      }
  
      // Ensure user is verified before allowing login
      if (!user.isVerified) {
        return res.status(403).json({ message: "Please verify your email to log in." });
      }
  
      // Verify password
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({ message: "Incorrect email or password." });
      }
  
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role, isAdmin: user.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );
  
      // Determine redirect URL based on role
      let dashboardUrl = "";
      if (user.isAdmin) {
        dashboardUrl = "https://elitecab.com/admin-dashboard"; // Admin Dashboard
      } else if (user.role === "driver") {
        dashboardUrl = "https://elitecab.com/driver-dashboard"; // Driver Dashboard
      } else {
        dashboardUrl = "https://elitecab.com/passenger-dashboard"; // Passenger Dashboard
      }
  
      // Remove sensitive data before sending response
      const { password: _, ...userData } = user.toObject();
  
      return res.status(200).json({
        message: "Login successful. Welcome to Elite Cab! 🚖",
        user: userData,
        token,
        dashboardUrl, 
      });
  
    } catch (error) {
      console.error("Error during login:", error);
      return res.status(500).json({ message: "An error occurred during login. Please try again later." });
    }
  };
  


  exports.getUserById = async (req, res) => {
    try {
      const { id } = req.params;
  
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid user ID format." });
      }
  
      // Find the user by ID
      const user = await userModel.findById(id).select("-password"); // Exclude password
  
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      return res.status(200).json({
        message: "User retrieved successfully.",
        user,
      });
  
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ message: "An error occurred while retrieving the user." });
    }
  };

  

  exports.getAllUsers = async (req, res) => {
    try {
      // Fetch all users, excluding passwords
      const users = await userModel.find().select("-password");
  
      if (users.length === 0) {
        return res.status(404).json({ message: "No users found." });
      }
  
      return res.status(200).json({
        message: "Users retrieved successfully.",
        totalUsers: users.length,
        users,
      });
  
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "An error occurred while retrieving users." });
    }
  };


exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, phoneNumber, gender, location } = req.body;

        // Ensure user exists
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Validate firstName and lastName (if provided)
        const nameRegex = /^[a-zA-Z]{3,}$/;
        if (firstName && !nameRegex.test(firstName.trim())) {
            return res.status(400).json({ message: "First name must be at least 3 letters with no symbols or numbers." });
        }
        if (lastName && !nameRegex.test(lastName.trim())) {
            return res.status(400).json({ message: "Last name must be at least 3 letters with no symbols or numbers." });
        }

        // Validate phoneNumber (if provided) - Must be exactly 11 digits
        const phoneRegex = /^\d{11}$/;
        if (phoneNumber && !phoneRegex.test(phoneNumber.trim())) {
            return res.status(400).json({ message: "Phone number must be exactly 11 digits, no letters or symbols." });
        }

        // Check if phone number already exists (excluding the current user)
        if (phoneNumber) {
            const existingUser = await userModel.findOne({ phoneNumber, _id: { $ne: id } });
            if (existingUser) {
                return res.status(400).json({ message: "Phone number is already in use by another user." });
            }
        }

        // Validate gender (if provided)
        const validGenders = ["male", "female", "non-binary", "prefer not to say"];
        if (gender && !validGenders.includes(gender.toLowerCase())) {
            return res.status(400).json({ message: `Invalid gender value. Allowed values: ${validGenders.join(", ")}.` });
        }

        // Handle profile picture upload
        let updatedProfilePicture = user.profilePicture;
        if (req.file) {
            // Upload new image to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, { folder: "profile_pictures" });

            // Delete old profile picture from Cloudinary (if exists)
            if (user.profilePicture.pictureId) {
                await cloudinary.uploader.destroy(user.profilePicture.pictureId);
            }

            // Update profile picture data
            updatedProfilePicture = {
                pictureId: result.public_id,
                pictureUrl: result.secure_url
            };
        }

        // Update user with allowed fields only (excluding unique fields like email & username)
        const updatedUser = await userModel.findByIdAndUpdate(
            id,
            { firstName, lastName, phoneNumber, gender, location, profilePicture: updatedProfilePicture },
            { new: true }
        ).select("-password"); // Exclude password from response

        return res.status(200).json({
            message: "User details updated successfully.",
            user: updatedUser,
        });

    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({ message: "An error occurred while updating user details." });
    }
};

  
  exports.deleteUser = async (req, res) => {
    try {
      const { id } = req.params;
  
      // Check if the user exists
      const user = await userModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      // Delete the user
      await userModel.findByIdAndDelete(id);
  
      return res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ message: "An error occurred while deleting the user." });
    }
  };

  

  exports.makeAdmin = async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user; // The user making the request
  
      // Ensure only admins can perform this action
      if (!requestingUser.isAdmin) {
        return res.status(403).json({ message: "Unauthorized. Only admins can assign admin roles." });
      }
  
      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid user ID format." });
      }
  
      // Find and update user role
      const user = await userModel.findByIdAndUpdate(
        id,
        { isAdmin: true },
        { new: true }
      );
  
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      if (user.isAdmin) {
        return res.status(400).json({ message: "User is already an admin. No changes were made." });
      }
  
      return res.status(200).json({
        message: `${user.firstName} is now an Admin and has been granted admin privileges.`,
        user: { id: user._id, email: user.email, isAdmin: user.isAdmin },
      });
  
    } catch (error) {
      console.error("Error making user admin:", error);
      return res.status(500).json({ message: "An error occurred while updating user role." });
    }
  };
  



exports.updateProfilePicture = async (req, res) => {
  try {
      const { id } = req.params;

      // Ensure user exists
      const user = await userModel.findById(id);
      if (!user) {
          return res.status(404).json({ message: "User not found." });
      }

      // Check if a file is uploaded
      if (!req.file) {
          return res.status(400).json({ message: "Please upload a profile picture." });
      }

      // Upload new image to Cloudinary
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
          folder: "profile_pictures",
      });

      // Delete old picture from Cloudinary (if it exists)
      if (user.profilePicture.pictureId) {
          await cloudinary.uploader.destroy(user.profilePicture.pictureId);
      }

      // Update user's profilePicture field with new image data
      user.profilePicture = {
          pictureId: uploadedImage.public_id,
          pictureUrl: uploadedImage.secure_url,
      };

      await user.save();

      return res.status(200).json({
          message: "Profile picture updated successfully.",
          profilePicture: user.profilePicture,
      });

  } catch (error) {
      console.error("Error updating profile picture:", error);
      return res.status(500).json({ message: "An error occurred while updating the profile picture." });
  }
};
