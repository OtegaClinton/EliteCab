const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const Ride = require('../models/rideModel');
const LiveRideTracking = require('../models/liveRideTrackingModel');

const verifyToken = promisify(jwt.verify);
let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true
      }
    });

    // Enhanced authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          throw new Error('Authentication token missing');
        }

        const decoded = await verifyToken(token, process.env.JWT_SECRET);
        socket.user = {
          id: decoded.id,
          role: decoded.role
        };
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id} (User: ${socket.user?.id})`);

      // Join ride room with validation
      socket.on('joinRide', async (rideId, callback) => {
        try {
          if (!mongoose.Types.ObjectId.isValid(rideId)) {
            throw new Error('Invalid ride ID');
          }

          const [ride, liveRide] = await Promise.all([
            Ride.findById(rideId).lean(),
            LiveRideTracking.findOne({ rideId }).lean()
          ]);

          if (!ride || !liveRide) {
            throw new Error('Ride not found');
          }

          // Authorization check
          const isDriver = liveRide.driverId.toString() === socket.user.id;
          const isPassenger = liveRide.passengers.some(p => 
            p.user.toString() === socket.user.id
          );

          if (!isDriver && !isPassenger) {
            throw new Error('Unauthorized to join ride');
          }

          await socket.join(`ride_${rideId}`);
          if (isDriver) {
            await socket.join(`driver_${rideId}`);
          }

          callback({ status: 'success' });
        } catch (error) {
          console.error('Join ride error:', error);
          callback({ status: 'error', message: error.message });
        }
      });

      // Location updates with validation
      socket.on('updateLocation', async (data, callback) => {
        try {
          const { rideId, latitude, longitude } = data;

          // Validate coordinates
          if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
              latitude < -90 || latitude > 90 ||
              longitude < -180 || longitude > 180) {
            throw new Error('Invalid coordinates');
          }

          const liveRide = await LiveRideTracking.findOne({ rideId });
          if (!liveRide) {
            throw new Error('Ride not found');
          }

          // Verify driver
          if (liveRide.driverId.toString() !== socket.user.id) {
            throw new Error('Only driver can update location');
          }

          const newLocation = {
            coordinates: { latitude, longitude },
            timestamp: new Date()
          };

          await LiveRideTracking.updateOne(
            { rideId },
            { $push: { locations: newLocation } }
          );

          io.to(`ride_${rideId}`).emit('locationUpdated', newLocation);
          callback({ status: 'success' });
        } catch (error) {
          console.error('Location update error:', error);
          callback({ status: 'error', message: error.message });
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) throw new Error('Socket.IO not initialized!');
    return io;
  }
};