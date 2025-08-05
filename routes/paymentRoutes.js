// const express = require('express');
// const paypal = require('@paypal/checkout-server-sdk');
// require('../controllers/paymentController');

// const router = express.Router();


// router.post('/charge-payment', paymentController.chargePayment);

// router.post('/create-order', paymentController.createOrder);
// router.post('/capture-order', paymentController.captureOrder);
// router.post('/payout', paymentController.payoutToDriver);


// module.exports = router;


const express = require('express');
const router = express.Router();

// ✅ Assign the controller to a variable
const paymentController = require('../controllers/paymentController');

// ✅ Define routes using the controller functions
router.post('/charge-payment', paymentController.chargePayment);
router.post('/create-order', paymentController.createOrder);
router.post('/capture-order', paymentController.captureOrder);
router.post('/payout', paymentController.payoutToDriver);

module.exports = router;
