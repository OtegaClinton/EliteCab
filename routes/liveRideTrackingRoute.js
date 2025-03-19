const express = require('express');
const liveRideTrackingController = require('../controllers/liveRideTrackingController');
const authMiddleware = require('../middlewares/authentication');

const router = express.Router();

// Protect all routes with authentication middleware
router.use(authMiddleware);

// Start a ride
router.post('/start', liveRideTrackingController.startRide);

// End a ride
router.post('/end', liveRideTrackingController.endRide);

module.exports = router;