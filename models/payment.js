const express = require('express');
const paypal = require('@paypal/checkout-server-sdk');
require('../controller/paymentController');

const router = express.Router();

router.post('/create-payment', async (req, res) => {
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
            amount: {
                currency_code: 'USD',
                value: req.body.amount  // Get ride fare from request
            }
        }]
    });

    try {
        const response = await paypalClient().execute(request);
        res.json({ id: response.result.id });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/capture-payment', async (req, res) => {
    const orderId = req.body.orderID;
    const request = new paypal.orders.OrdersCaptureRequest(orderId);

    try {
        const response = await paypalClient().execute(request);
        res.json(response.result);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;;