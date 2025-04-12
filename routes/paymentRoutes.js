const express = require('express');
const paypal = require('@paypal/checkout-server-sdk');
require('../controllers/paymentController');

const router = express.Router();


router.post('/charge-payment', paymentController.chargePayment);

router.post('/create-order', paymentController.createOrder);
router.post('/capture-order', paymentController.captureOrder);
router.post('/payout', paymentController.payoutToDriver);


module.exports = router;