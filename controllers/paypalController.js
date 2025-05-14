const paypal = require('@paypal/checkout-server-sdk');
const paypalClient = require('../config/paypalClient');
const paypalPayment = require('../models/paypalModel');

exports.createOrder = async (req, res) => {
  const { amount, rideId } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: amount.toFixed(2)
      },
      reference_id: rideId
    }]
  });

  try {
    const order = await paypalClient.execute(request);
    res.status(200).json({ orderId: order.result.id });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

exports.captureOrder = async (req, res) => {
  const { orderId, rideId } = req.body;

  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const capture = await paypalClient.execute(request);
    const details = capture.result;

    await Payment.create({
      user: req.user.id,
      ride: rideId,
      orderId,
      amount: details.purchase_units[0].payments.captures[0].amount.value,
      status: details.status,
      paypalData: details
    });

// Save a new PayPal payment
await paypalPayment.create({
  user: req.user?.sub || null,
  ride: rideId,
  orderId,
  captureId: capture.result.purchase_units[0].payments.captures[0].id,
  amount: {
    value: capture.result.purchase_units[0].payments.captures[0].amount.value,
    currency_code: capture.result.purchase_units[0].payments.captures[0].amount.currency_code
  },
  status: capture.result.status,
  payer: {
    email_address: capture.result.payer.email_address,
    payer_id: capture.result.payer.payer_id,
    name: capture.result.payer.name,
    country_code: capture.result.payer.address?.country_code
  },
  paypalData: capture.result
});

    res.status(200).json({ message: 'Payment captured successfully', capture: details });
  } catch (error) {
    console.error('Payment capture error:', error);
    res.status(500).json({ error: 'Payment capture failed' });
  }
};

exports.getPaymentDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const request = new paypal.orders.OrdersGetRequest(orderId);
    const order = await paypalClient.execute(request);

    res.status(200).json(order.result);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
};

exports.payoutToDriver = async (req, res) => {
  const { driverEmail, amount } = req.body;

  if (!driverEmail || !amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid payout request' });
  }

  const payoutRequest = new paypal.payouts.PayoutsPostRequest();
  payoutRequest.requestBody({
    sender_batch_header: {
      sender_batch_id: `batch_${Date.now()}`,
      email_subject: 'Your payout from EliteCab'
    },
    items: [{
      recipient_type: 'EMAIL',
      amount: {
        value: amount.toFixed(2),
        currency: 'USD'
      },
      receiver: driverEmail,
      sender_item_id: `item_${Date.now()}`
    }]
  });

  try {
    const payout = await paypalClient.execute(payoutRequest);
    res.status(200).json({ status: 'Payout sent', payout });
  } catch (error) {
    console.error('Payout error:', error);
    res.status(500).json({ error: 'Failed to send payout' });
  }
};


