const nodemailer = require("nodemailer");
require("dotenv").config();

const sendMail = async (options) => {
  try {
    // Create a transporter object
    const transporter = nodemailer.createTransport({
      service: process.env.SERVICE, // Service (like 'gmail')
      secure: process.env.SERVICE === 'gmail', // True if using 'gmail', adjust as needed
      auth: {
        user: process.env.mailUser, // Your email address
        pass: process.env.mailPassword, // Your email password or app-specific password
      },
    });

    // Define the email options
    const mailOptions = {
      from: `"EliteCab" <${process.env.mailUser}>`, 
      to: options.to, // Recipient email address
      subject: options.subject, // Email subject
      text: options.text || '', // Optional plain text content
      html: options.html, // HTML content of the email
      attachments: options.attachments || [], // Optional attachments
};

    // Debugging: Log mail options
    console.log("Mail options:", mailOptions);

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = sendMail;

