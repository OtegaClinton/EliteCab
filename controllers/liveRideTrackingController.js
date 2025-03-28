const LiveRideTracking = require('../models/liveRideTrackingModel');
const Ride = require('../models/rideModel');
const socketIO = require('../sockets/socketConnection');
const mongoose = require('mongoose');
const { CircuitBreaker } = require('../utils/circuitBreaker');

// Role checking middleware
exports.checkRole = (req, res, next) => {
  if (req.user.role === "driver" || req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      code: 'DRIVER_REQUIRED',
      message: 'Only drivers can perform this operation'
    });
  }
};

// Circuit breaker instance for startRide
const startRideBreaker = new CircuitBreaker(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { rideId } = req.body;
      const driverId = req.user.id;

      // Validate input
      if (!mongoose.Types.ObjectId.isValid(rideId)) {
        throw new Error('Invalid ride ID format');
      }

      const [ride, existingLiveRide] = await Promise.all([
        Ride.findById(rideId)
          .populate({
            path: 'passengers.user',
            select: '_id name pickupLocation dropoffLocation'
          })
          .session(session),
        LiveRideTracking.findOne({ rideId }).session(session)
      ]);

      if (!ride) {
        throw Object.assign(new Error('Ride not found'), { code: 'RIDE_NOT_FOUND', statusCode: 404 });
      }

      if (ride.driver.toString() !== driverId) {
        throw Object.assign(new Error('Unauthorized driver'), { code: 'UNAUTHORIZED_DRIVER', statusCode: 403 });
      }

      if (existingLiveRide) {
        throw Object.assign(new Error('Ride already started'), { code: 'DUPLICATE_RIDE', statusCode: 409 });
      }

      const acceptedPassengers = ride.passengers
        .filter(p => p.status === 'accepted')
        .map(p => ({
          user: p.user._id,
          status: 'accepted',
          pickupLocation: p.pickupLocation || ride.from,
          dropoffLocation: p.dropoffLocation || ride.to,
          approvedAt: p.approvedAt || new Date()
        }));

      if (acceptedPassengers.length === 0) {
        throw Object.assign(new Error('No accepted passengers'), { code: 'NO_ACCEPTED_PASSENGERS', statusCode: 400 });
      }

      const initialLocation = {
        coordinates: {
          latitude: ride.from?.coordinates?.latitude || 0,
          longitude: ride.from?.coordinates?.longitude || 0
        },
        timestamp: new Date()
      };

      const [newLiveRide] = await Promise.all([
        LiveRideTracking.create([{
          rideId,
          driverId,
          passengers: acceptedPassengers,
          status: 'in_progress',
          locations: [initialLocation]
        }], { session }),
        Ride.findByIdAndUpdate(
          rideId,
          { status: 'in_progress', startedAt: new Date() },
          { session, new: true }
        )
      ]);

      // Emit event after successful commit
      process.nextTick(() => {
        try {
          socketIO.getIO().to(`ride_${rideId}`).emit('rideStarted', {
            rideId,
            startTime: newLiveRide[0].startTime,
            driverId,
            passengerCount: acceptedPassengers.length,
            firstLocation: initialLocation
          });
        } catch (socketError) {
          console.error('Socket emit failed:', socketError);
        }
      });

      res.status(201).json({
        success: true,
        message: 'Ride started successfully',
        data: {
          liveRideId: newLiveRide[0]._id,
          startTime: newLiveRide[0].startTime,
          firstLocation: initialLocation,
          passengers: acceptedPassengers.map(p => ({
            userId: p.user,
            pickup: p.pickupLocation,
            dropoff: p.dropoffLocation
          }))
        }
      });
    });
  } finally {
    session.endSession();
  }
}, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

// Start ride endpoint
exports.startRide = async (req, res) => {
  try {
    await startRideBreaker.fire(req, res);
  } catch (error) {
    console.error('Start Ride Error:', {
      error: error.message,
      code: error.code || 'START_RIDE_FAILED',
      stack: error.stack,
      body: req.body,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      code: error.code || 'START_RIDE_FAILED',
      message: error.message || 'Failed to start ride',
      ...(process.env.NODE_ENV !== 'production' && {
        details: {
          type: error.name,
          ...(error.stack && { stack: error.stack })
        }
      })
    });
  }
};

// Update location endpoint
exports.updateLocation = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { latitude, longitude } = req.body;
      const { rideId } = req.params;
      const driverId = req.user.id;

      // Validate coordinates
      if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
          latitude < -90 || latitude > 90 ||
          longitude < -180 || longitude > 180) {
        throw Object.assign(new Error('Invalid coordinates'), { code: 'INVALID_COORDINATES', statusCode: 400 });
      }

      const liveRide = await LiveRideTracking.findOne({ rideId }).session(session);
      if (!liveRide) {
        throw Object.assign(new Error('Live ride not found'), { code: 'RIDE_NOT_FOUND', statusCode: 404 });
      }

      if (liveRide.driverId.toString() !== driverId) {
        throw Object.assign(new Error('Unauthorized driver'), { code: 'UNAUTHORIZED_DRIVER', statusCode: 403 });
      }

      const newLocation = {
        coordinates: { latitude, longitude },
        timestamp: new Date()
      };

      const updatedRide = await LiveRideTracking.findOneAndUpdate(
        { rideId },
        { $push: { locations: newLocation } },
        { new: true, session }
      );

      // Emit after successful update
      process.nextTick(() => {
        try {
          socketIO.getIO().to(`ride_${rideId}`).emit('locationUpdated', {
            rideId,
            location: newLocation,
            sequence: updatedRide.locations.length
          });
        } catch (socketError) {
          console.error('Socket emit failed:', socketError);
        }
      });

      res.status(200).json({
        success: true,
        data: newLocation
      });
    });
  } catch (error) {
    console.error('Update Location Error:', {
      error: error.message,
      code: error.code || 'UPDATE_FAILED',
      stack: error.stack,
      params: req.params,
      timestamp: new Date().toISOString()
    });

    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      code: error.code || 'UPDATE_FAILED',
      message: error.message || 'Location update failed'
    });
  } finally {
    session.endSession();
  }
};

// End ride for specific passenger
exports.endRideForPassenger = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { rideId, passengerId } = req.params;
      const userId = req.user.id;

      const liveRide = await LiveRideTracking.findOne({ rideId }).session(session);
      if (!liveRide) {
        throw Object.assign(new Error('Live ride not found'), { code: 'RIDE_NOT_FOUND', statusCode: 404 });
      }

      // Check authorization
      const isDriver = liveRide.driverId.toString() === userId;
      const isPassenger = passengerId === userId;
      
      if (!isDriver && !isPassenger) {
        throw Object.assign(new Error('Not authorized'), { code: 'UNAUTHORIZED', statusCode: 403 });
      }

      const passenger = liveRide.passengers.find(p => 
        p.user.toString() === passengerId
      );
      
      if (!passenger) {
        throw Object.assign(new Error('Passenger not found'), { code: 'PASSENGER_NOT_FOUND', statusCode: 404 });
      }

      // Update passenger status
      passenger.status = 'completed';
      passenger.endTime = new Date();

      // Check if all passengers completed
      const allCompleted = liveRide.passengers.every(p => 
        p.status === 'completed'
      );

      if (allCompleted) {
        liveRide.status = 'completed';
        liveRide.endTime = new Date();
        await Promise.all([
          liveRide.save({ session }),
          Ride.findByIdAndUpdate(rideId, { status: 'completed' }, { session })
        ]);
        
        // Notify all participants
        process.nextTick(() => {
          try {
            socketIO.getIO().to(`ride_${rideId}`).emit('rideEnded', {
              rideId,
              endTime: liveRide.endTime
            });
          } catch (socketError) {
            console.error('Socket emit failed:', socketError);
          }
        });
      } else {
        await liveRide.save({ session });
      }

      // Notify specific passenger
      process.nextTick(() => {
        try {
          socketIO.getIO().to(`user_${passengerId}`).emit('passengerRideEnded', {
            rideId,
            endTime: passenger.endTime
          });
        } catch (socketError) {
          console.error('Socket emit failed:', socketError);
        }
      });

      res.status(200).json({
        success: true,
        data: {
          passengerId,
          status: 'completed',
          endTime: passenger.endTime
        }
      });
    });
  } catch (error) {
    console.error('End Ride For Passenger Error:', {
      error: error.message,
      code: error.code || 'PASSENGER_END_FAILED',
      stack: error.stack,
      params: req.params,
      timestamp: new Date().toISOString()
    });

    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      code: error.code || 'PASSENGER_END_FAILED',
      message: error.message || 'Failed to end passenger ride'
    });
  } finally {
    session.endSession();
  }
};

// End entire ride
exports.endRide = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { rideId } = req.body;
      const driverId = req.user.id;

      const [ride, liveRide] = await Promise.all([
        Ride.findById(rideId).session(session),
        LiveRideTracking.findOne({ rideId, driverId }).session(session)
      ]);

      if (!ride || !liveRide) {
        throw Object.assign(new Error('Ride not found'), { code: 'RIDE_NOT_FOUND', statusCode: 404 });
      }

      const updateOperations = [
        Ride.findByIdAndUpdate(
          rideId,
          { status: 'completed' },
          { session, new: true }
        ),
        LiveRideTracking.findOneAndUpdate(
          { rideId },
          { 
            status: 'completed',
            endTime: new Date(),
            'passengers.$[].status': 'completed',
            'passengers.$[].endTime': new Date()
          },
          { session, new: true }
        )
      ];

      const [updatedRide, updatedLiveRide] = await Promise.all(updateOperations);

      // Notify all participants
      process.nextTick(() => {
        try {
          socketIO.getIO().to(`ride_${rideId}`).emit('rideEnded', {
            rideId,
            endTime: updatedLiveRide.endTime
          });

          // Notify passengers individually
          updatedLiveRide.passengers.forEach(passenger => {
            socketIO.getIO().to(`user_${passenger.user}`).emit('passengerRideEnded', {
              rideId,
              endTime: updatedLiveRide.endTime
            });
          });
        } catch (socketError) {
          console.error('Socket emit failed:', socketError);
        }
      });

      res.status(200).json({
        success: true,
        data: updatedLiveRide
      });
    });
  } catch (error) {
    console.error('End Ride Error:', {
      error: error.message,
      code: error.code || 'END_FAILED',
      stack: error.stack,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      code: error.code || 'END_FAILED',
      message: error.message || 'Failed to end ride'
    });
  } finally {
    session.endSession();
  }
};

// Get ride status
exports.getRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;

    const liveRide = await LiveRideTracking.findOne({ rideId })
      .populate('passengers.user', 'name phone');

    if (!liveRide) {
      return res.status(404).json({
        success: false,
        code: 'RIDE_NOT_FOUND',
        message: 'Live ride not found'
      });
    }

    // Check authorization
    const isDriver = liveRide.driverId.toString() === userId;
    const isPassenger = liveRide.passengers.some(p => 
      p.user._id.toString() === userId
    );

    if (!isDriver && !isPassenger) {
      return res.status(403).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Not authorized to view this ride'
      });
    }

    const response = {
      status: liveRide.status,
      currentLocation: liveRide.locations.slice(-1)[0] || null,
      startTime: liveRide.startTime,
      endTime: liveRide.endTime,
      passengers: liveRide.passengers.map(p => ({
        user: p.user,
        status: p.status,
        endTime: p.endTime
      })),
      rideDetails: {
        from: req.ride?.from,
        to: req.ride?.to,
        distance: req.ride?.distance,
        duration: req.ride?.duration
      }
    };

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Get Ride Status Error:', {
      error: error.message,
      code: 'STATUS_FAILED',
      stack: error.stack,
      params: req.params,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      code: 'STATUS_FAILED',
      message: 'Failed to get ride status'
    });
  }
};