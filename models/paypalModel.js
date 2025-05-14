const mongoose = require('mongoose');

const paypalPaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // optional if user comes from OAuth
  },
  ride: {
    type: String,
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  captureId: {
    type: String,
    required: false
  },
  amount: {
    value: { type: String, required: true },
    currency_code: { type: String, default: 'USD' }
  },
  status: {
    type: String,
    enum: ['CREATED', 'APPROVED', 'COMPLETED', 'FAILED'],
    default: 'CREATED'
  },
  payer: {
    email_address: String,
    payer_id: String,
    name: {
      given_name: String,
      surname: String
    },
    country_code: String
  },
  paypalData: {
    type: mongoose.Schema.Types.Mixed, // raw response from PayPal
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('paypalPayment', paypalPaymentSchema);
