const express = require('express');
const router = express.Router();
const { payRide } = require('../controllers/payRideController');
const { authenticator } = require('../middlewares/authentication');

router.post('/pay', authenticator, payRide);

module.exports = router;
