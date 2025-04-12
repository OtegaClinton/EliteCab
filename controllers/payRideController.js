const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const payRideModel = require('../models/payRideModel');
const rideModel = require('../models/rideModel');
const userModel = require('../models/userModel');
const sendMail = require('../helpers/email');

// Function to generate a PDF receipt
const generateReceiptPDF = (payment, passenger, driver) => {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument();
    const receiptsDir = path.join(__dirname, '../storage/receipts');
    const receiptPath = path.join(receiptsDir, `receipt-${payment._id}.pdf`);

    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    const writeStream = fs.createWriteStream(receiptPath);
    doc.pipe(writeStream);

    try {
      // Load Logo
      const logoUrl = 'https://res.cloudinary.com/dobng9jwd/image/upload/v1743269345/d00e9286-3d59-4cb3-869c-ac79c489509b-removebg-preview_zkdtar.png';
      const logoResponse = await axios.get(logoUrl, { responseType: 'arraybuffer' });
      const logoBuffer = Buffer.from(logoResponse.data, 'binary');
      doc.image(logoBuffer, { fit: [100, 100], align: 'left', valign: 'top' });

      // Load Stamp
      const stampUrl = 'https://res.cloudinary.com/dobng9jwd/image/upload/v1743262411/d7558699-9e96-4706-8496-a140a05fff0e_itgera.png';
      const stampResponse = await axios.get(stampUrl, { responseType: 'arraybuffer' });
      const stampBuffer = Buffer.from(stampResponse.data, 'binary');
      doc.image(stampBuffer, 450, 650, { fit: [100, 100], opacity: 0.3 });

      // PDF Content
      doc.moveDown();
      doc.fontSize(26).font('Helvetica-Bold').text('Ride Payment Receipt', { align: 'center' });
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold').text('Receipt Details:', { underline: true });
      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica')
        .text(`Payee Name: ${passenger.firstName} ${passenger.lastName}`)
        .moveDown(0.5)
        .text(`Amount Paid: N${payment.amount}`)
        .moveDown(0.5)
        .text(`Receipt ID: ${payment._id}`)
        .moveDown(0.5)
        .text(`Date: ${new Date().toLocaleDateString()}`)
        .moveDown(0.5)
        .text(`Payment Method: ${payment.paymentMethod}`)
        .moveDown(0.5)
        .text(`Transaction ID: ${payment.transactionId}`)
        .moveDown(0.5)
        .text(`Driver: ${driver.firstName} ${driver.lastName}`)
        .moveDown(0.5)
        .text(`Status: ${payment.status}`);

      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(2);
      doc.fontSize(16).font('Helvetica-Bold').text('Thank you for using EliteCab!', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => resolve(receiptPath));
      writeStream.on('error', (error) => reject(error));
    } catch (error) {
      reject(error);
    }
  });
};

// Dummy payment processor
const processPayment = async ({ amount, paymentMethod }) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    success: true,
    transactionId: `TXN-${Date.now()}`
  };
};

// Main Payment Controller
const payRide = async (req, res) => {
  let receiptPath;

  try {
    const passengerId = req.user.id;
    const { rideId, paymentMethod, amount } = req.body;

    if (!rideId || !paymentMethod || !amount) {
      return res.status(400).json({ message: 'Ride ID, payment method, and amount are required.' });
    }
    

    const validMethods = ['Card', 'Transfer', 'Wallet'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method.' });
    }

    const ride = await rideModel.findById(rideId).populate('driver');
    const passenger = await userModel.findById(passengerId);

    if (!ride || !passenger) {
      return res.status(404).json({ message: 'Ride or passenger not found.' });
    }

    const driver = ride.driver;

    const transactionResult = await processPayment({ amount, paymentMethod });
    if (!transactionResult.success) {
      return res.status(400).json({ message: 'Payment failed.', error: transactionResult.error });
    }

    const newPayment = new payRideModel({
      passenger: passengerId,
      driver: driver._id,
      ride: rideId,
      amount,
      paymentMethod,
      transactionId: transactionResult.transactionId,
      status: 'Paid'
    });

    await newPayment.save();

    // Generate PDF
    receiptPath = await generateReceiptPDF(newPayment, passenger, driver);

    const emailContent = `
      <div style="font-family:sans-serif;padding:20px;">
        <h2>Ride Payment Confirmation</h2>
        <p>Hello ${passenger.firstName},</p>
        <p>Your payment of <strong>₦${amount}</strong> for the ride with ${driver.firstName} ${driver.lastName} has been received.</p>
        <p>Attached is your receipt.</p>
        <p>Thanks for riding with EliteCab!</p>
      </div>
    `;

    await sendMail({
      to: passenger.email,
      subject: 'Ride Payment Receipt',
      html: emailContent,
      attachments: [
        {
          filename: `ride-receipt-${newPayment._id}.pdf`,
          path: receiptPath,
          contentType: 'application/pdf'
        }
      ]
    });

    // Clean up file
    if (fs.existsSync(receiptPath)) {
      fs.unlinkSync(receiptPath);
    }

    res.status(200).json({ message: 'Payment successful and receipt sent.' });

  } catch (error) {
    console.error('Payment Error:', error);
    if (receiptPath && fs.existsSync(receiptPath)) {
      fs.unlinkSync(receiptPath);
    }
    res.status(500).json({ message: 'Ride payment failed.', error: error.message });
  }
};

module.exports = { payRide };
