const express = require('express');
const {
    checkRole,
    startRide,
    updateLocation,
    endRide,
    endRideForPassenger,
    getRideStatus
} = require('../controllers/liveRideTrackingController');
const { authenticator } = require('../middlewares/authentication');
const { 
    validateRideExists,
    validateDriverOwnership,
    validatePassengerAccess,
    validateCoordinates
} = require('../middlewares/rideValidation');

const router = express.Router();

// Protect all routes with authentication
router.use(authenticator);

// Start ride (Driver only)
router.post('/start', checkRole, validateRideExists, validateDriverOwnership, startRide);

// Location updates (Driver only)
router.post(
    '/:rideId/location',
    validateRideExists,
    validateDriverOwnership,
    validateCoordinates,
    updateLocation
);

// End ride for specific passenger (Driver or passenger themselves)
router.post(
    '/:rideId/passengers/:passengerId/end',
    checkRole, 
    validateRideExists,
    validatePassengerAccess,
    endRideForPassenger
);

// End entire ride (Driver only)
router.post('/end', checkRole, validateRideExists, validateDriverOwnership, endRide);

// Get ride status (Driver or passenger)
router.get('/:rideId/status', validateRideExists, validatePassengerAccess, getRideStatus);

module.exports = router;