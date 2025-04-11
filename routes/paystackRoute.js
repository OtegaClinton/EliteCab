const express = require('express');
const router = express.Router();
const paystackController = require('../controllers/paystackController');

router.post('/initialize', paystackController.initializePassengerPayment);
router.get('/verify', paystackController.verifyPayment);
router.post('/webhook', express.json({ 
    verify: (req, res, buf) => req.rawBody = buf }),
     paystackController.paystackWebhook );

module.exports = router;
