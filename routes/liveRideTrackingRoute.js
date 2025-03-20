const express = require('express');
const liveRideTrackingController = require('../controllers/liveRideTrackingController');
const { authenticator } = require('../middlewares/authentication');

const router = express.Router();

// Protect all routes with authentication middleware
router.use(authenticator);

// Start a ride
router.post('/start', liveRideTrackingController.startRide);

// Update location (real-time)
router.post('/update-location', liveRideTrackingController.updateLocation);

// End a ride
router.post('/end', liveRideTrackingController.endRide);

module.exports = router;