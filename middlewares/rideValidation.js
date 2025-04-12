const Ride = require('../models/rideModel');
const LiveRideTracking = require('../models/liveRideTrackingModel');

// Validate ride exists and attach to request
exports.validateRideExists = async (req, res, next) => {
    try {
        const rideId = req.params.rideId || req.body.rideId;
        
        if (!rideId) {
            return res.status(400).json({
                success: false,
                code: 'MISSING_RIDE_ID',
                message: 'Ride ID is required'
            });
        }

        const [ride, liveRide] = await Promise.all([
            Ride.findById(rideId),
            LiveRideTracking.findOne({ rideId })
        ]);

        if (!ride && !liveRide) {
            return res.status(404).json({
                success: false,
                code: 'RIDE_NOT_FOUND',
                message: 'Ride not found'
            });
        }

        req.ride = ride || liveRide;
        next();
    } catch (error) {
        next(error);
    }
};

// Validate driver owns the ride
exports.validateDriverOwnership = (req, res, next) => {
    if (!req.ride) {
        return res.status(500).json({
            success: false,
            code: 'RIDE_NOT_ATTACHED',
            message: 'Ride not attached to request'
        });
    }

    if (req.ride.driver.toString() !== req.user.id) {
        return res.status(403).json({
            success: false,
            code: 'UNAUTHORIZED_DRIVER',
            message: 'You do not own this ride'
        });
    }
    next();
};

// Validate passenger has access to ride
exports.validatePassengerAccess = (req, res, next) => {
    if (!req.ride) {
        return res.status(500).json({
            success: false,
            code: 'RIDE_NOT_ATTACHED',
            message: 'Ride not attached to request'
        });
    }

    const { passengerId } = req.params;
    const userId = req.user.id;

    // Check if driver
    if (req.ride.driver.toString() === userId) return next();

    // Check if passenger (and matching ID if specified)
    const isPassenger = req.ride.passengers?.some(p => 
        p.user.toString() === userId && 
        (!passengerId || passengerId === userId)
    );

    if (!isPassenger) {
        return res.status(403).json({
            success: false,
            code: 'UNAUTHORIZED_ACCESS',
            message: 'No access to this ride'
        });
    }
    next();
};

// Validate coordinate values
exports.validateCoordinates = (req, res, next) => {
    const { latitude, longitude } = req.body;
    
    if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
        return res.status(400).json({
            success: false,
            code: 'INVALID_COORDINATES',
            message: 'Invalid latitude or longitude values'
        });
    }
    next();
};