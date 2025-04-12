const axios = require('axios');
const Ride = require('../models/rideModel');
require('dotenv').config()

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

exports.initializePassengerPayment = async (req, res) => {
  try {
    const { email, amount, rideId, passengerId } = req.body;

    const response = await axios.post('https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amount * 100,
        metadata: {
          rideId,
          passengerId
        },
        callback_url: `https://elitecab.onrender.com/api/paystack/verify`
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`
        }
      }
    );
    console.log(response.data); // <- this logs the API response
    res.status(200).json(response.data);// <<- this sends the response 

    res.json({ authorization_url: response.data.data.authorization_url }

    );
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.query;

    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`
      }
    });

    const { status, metadata } = response.data.data;

    if (status === 'success') {
      await Ride.updateOne(
        {
          _id: metadata.rideId,
          'passengers.passenger': metadata.passengerId
        },
        {
          $set: {
            'passengers.$.paid': true,
            'passengers.$.reference': reference
          }
        }
      );
    }

    res.json({ 
      success: true, 
      message: 'Payment verified' 
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ 
      error: 'Verification failed' 
    });
  }
};

exports.paystackWebhook = async (req, res) => {
  try {
    const event = req.body;

    if (event.event === 'charge.success') {
      const { metadata, reference } = event.data;

      await Ride.updateOne(
        {
          _id: metadata.rideId,
          'passengers.passenger': metadata.passengerId
        },
        {
          $set: {
            'passengers.$.paid': true,
            'passengers.$.reference': reference
          }
        }
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(500);
  }
};

const checkRidePaymentCompletion = async (rideId) => {
  const ride = await Ride.findById(rideId);
  return ride.passengers.every(p => p.paid === true);
};
