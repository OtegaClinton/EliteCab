// const paypalClient = require('../config/paypal');

// exports.chargePayment = async (req, res) => {
//     try {
//         const { amount, currency, source } = req.body;
//         const charge = await paypal.charges.create({
//             amount,
//             currency,
//             source,
//             description: 'Ride Payment'
//         });
//         res.json({ success: true, charge });
//     } catch (error) {
//         res.status(500).json({ success: false, error: error.message });
//     }
// };


// exports.createOrder = async (req, res) => {
//   const { amount, rideId } = req.body;
//   const request = new paypal.orders.OrdersCreateRequest();
//   request.requestBody({
//     intent: 'CAPTURE',
//     purchase_units: [{
//       amount: { 
//         currency_code: 'USD',
//          value: amount.toFixed(2) },
//       reference_id: rideId
//     }]
//   });

//   try {
//     const { orderId, rideId } = req.body;

//     const request = new paypal.orders.OrdersCaptureRequest(orderId);
//     request.requestBody({});

//     const capture = await client.execute(request);

//     // Optional: Store capture info in DB
//     await Payment.create({
//       user: req.user.id,
//       ride: rideId,
//       orderId,
//       amount: capture.result.purchase_units[0].payments.captures[0].amount.value,
//       status: capture.result.status,
//       paypalData: capture.result,
//     });

//     res.status(200).json({ message: 'Payment captured successfully', capture: capture.result });
//   } catch (error) {
//     console.error('Payment capture error:', error);
//     res.status(500).json({ error: 'Payment capture failed' });
//   }
// };

// // Get PayPal order details
// exports.getPaymentDetails = async (req, res) => {
//   try {
//     const { orderId } = req.params;

//     const request = new paypal.orders.OrdersGetRequest(orderId);
//     const order = await client.execute(request);

//     res.status(200).json(order.result);
//   } catch (error) {
//     console.error('Payment detail fetch error:', error);
//     res.status(500).json({ error: 'Failed to fetch order details' });
//   }
// };

// exports.payoutToDriver = async (req, res) => {
//   const { driverEmail, amount } = req.body;
//   const payoutRequest = new paypal.payouts.PayoutsPostRequest();

//   payoutRequest.requestBody({
//     sender_batch_header: {
//       sender_batch_id: `batch_${Date.now()}`,
//       email_subject: 'Your payout from EliteCab!'
//     },
//     items: [{
//       recipient_type: 'EMAIL',
//       amount: {
//         value: amount.toFixed(2),
//         currency: 'USD'
//       },
//       receiver: driverEmail,
//       sender_item_id: `item_${Date.now()}`
//     }]
//   });

//   try {
//     const payout = await paypalClient.execute(payoutRequest);
//     res.json({ status: 'Payout sent', payout });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

const paypal = require('@paypal/checkout-server-sdk');
const paypalClient = require('../config/paypal');
// const Payment = require('../models/Payment'); // Uncomment if you're storing payments

exports.chargePayment = async (req, res) => {
  try {
    const { amount, currency, source } = req.body;
    const charge = await paypal.charges.create({
      amount,
      currency,
      source,
      description: 'Ride Payment'
    });
    res.json({ success: true, charge });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ 1. Create PayPal Order
exports.createOrder = async (req, res) => {
  const { amount, rideId } = req.body;

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

// ✅ 2. Capture PayPal Order
exports.captureOrder = async (req, res) => {
  const { orderId, rideId } = req.body;

  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const capture = await paypalClient.execute(request);

    // Optional: Save to DB
    // await Payment.create({
    //   user: req.user.id,
    //   ride: rideId,
    //   orderId,
    //   amount: capture.result.purchase_units[0].payments.captures[0].amount.value,
    //   status: capture.result.status,
    //   paypalData: capture.result,
    // });

    res.status(200).json({ message: 'Payment captured successfully', capture: capture.result });
  } catch (error) {
    console.error('Payment capture error:', error);
    res.status(500).json({ error: 'Payment capture failed' });
  }
};

// ✅ 3. Get PayPal Order Details
exports.getPaymentDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const request = new paypal.orders.OrdersGetRequest(orderId);
    const order = await paypalClient.execute(request);

    res.status(200).json(order.result);
  } catch (error) {
    console.error('Payment detail fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
};

// ✅ 4. Payout to Driver
exports.payoutToDriver = async (req, res) => {
  const { driverEmail, amount } = req.body;

  const payoutRequest = new paypal.payouts.PayoutsPostRequest();
  payoutRequest.requestBody({
    sender_batch_header: {
      sender_batch_id: `batch_${Date.now()}`,
      email_subject: 'Your payout from EliteCab!'
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
    res.json({ status: 'Payout sent', payout });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
