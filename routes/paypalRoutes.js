const express = require('express');
const router = express.Router();
const paypalController = require('../controllers/paypalController');
const oauth = require('../middlewares/oauth');

router.post('/create-order', oauth, paypalController.createOrder);
router.post('/capture-order', oauth, paypalController.captureOrder);
router.get('/order-details/:orderId', oauth, paypalController.getPaymentDetails);
router.post('/payout', oauth, paypalController.payoutToDriver);

module.exports = router;

