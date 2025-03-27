const Ride = require('../models/rideModel');
const LiveRideTracking = require('../models/liveRideTrackingModel');

module.exports = (socket, io) => {
  // Start Ride Event
  socket.on('startRide', async (rideId) => {
    try {
      const driverId = socket.user.id;
      const [ride, existingLiveRide] = await Promise.all([
        Ride.findById(rideId).populate('passengers.user'),
        LiveRideTracking.findOne({ rideId })
      ]);

      if (!ride || ride.driver.toString() !== driverId) {
        return socket.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Not authorized to start this ride'
        });
      }

      if (existingLiveRide) {
        return socket.emit('error', {
          code: 'RIDE_ACTIVE',
          message: 'Ride already in progress'
        });
      }

      const acceptedPassengers = ride.passengers
        .filter(p => p.status === 'accepted')
        .map(p => ({
          user: p.user._id,
          status: 'accepted',
          pickupLocation: p.pickupLocation,
          dropoffLocation: p.dropoffLocation
        }));

      const newLiveRide = await LiveRideTracking.create({
        rideId,
        driverId,
        passengers: acceptedPassengers,
        status: 'in_progress',
        startTime: new Date()
      });

      await Ride.findByIdAndUpdate(rideId, { status: 'in_progress' });

      io.to(`ride_${rideId}`).emit('rideStarted', {
        rideId,
        driver: ride.driver,
        passengers: acceptedPassengers,
        from: ride.from,
        to: ride.to,
        startTime: newLiveRide.startTime
      });

    } catch (error) {
      socket.emit('error', {
        code: 'START_FAILED',
        message: 'Failed to start ride'
      });
    }
  });

  // End Ride for Specific Passenger
  socket.on('endPassengerRide', async ({ rideId, passengerId }) => {
    try {
      const userId = socket.user.id;
      const liveRide = await LiveRideTracking.findOne({ rideId });

      if (!liveRide) {
        return socket.emit('error', {
          code: 'RIDE_NOT_FOUND',
          message: 'Live ride not found'
        });
      }

      // Check authorization (driver or passenger themselves)
      const isDriver = liveRide.driverId.toString() === userId;
      const isPassenger = passengerId === userId;
      
      if (!isDriver && !isPassenger) {
        return socket.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Not authorized to end this ride'
        });
      }

      const passenger = liveRide.passengers.find(p => 
        p.user.toString() === passengerId
      );
      
      if (!passenger) {
        return socket.emit('error', {
          code: 'PASSENGER_NOT_FOUND',
          message: 'Passenger not in this ride'
        });
      }

      // Update passenger status
      passenger.status = 'completed';
      passenger.endTime = new Date();

      // Check if all passengers have completed
      const allCompleted = liveRide.passengers.every(p => 
        p.status === 'completed'
      );

      if (allCompleted) {
        liveRide.status = 'completed';
        liveRide.endTime = new Date();
        await Ride.findByIdAndUpdate(rideId, { status: 'completed' });
        
        // Notify all participants
        io.to(`ride_${rideId}`).emit('rideEnded', {
          rideId,
          endTime: liveRide.endTime
        });
      }

      await liveRide.save();

      // Notify specific passenger
      io.to(`user_${passengerId}`).emit('passengerRideEnded', {
        rideId,
        endTime: passenger.endTime
      });

    } catch (error) {
      socket.emit('error', {
        code: 'PASSENGER_END_FAILED',
        message: 'Failed to end passenger ride'
      });
    }
  });

  // End Entire Ride
  socket.on('endRide', async (rideId) => {
    try {
      const driverId = socket.user.id;
      const [ride, liveRide] = await Promise.all([
        Ride.findByIdAndUpdate(rideId, { status: 'completed' }),
        LiveRideTracking.findOneAndUpdate(
          { rideId, driverId },
          { 
            status: 'completed',
            endTime: new Date(),
            'passengers.$[].status': 'completed',
            'passengers.$[].endTime': new Date()
          },
          { new: true }
        )
      ]);

      if (!ride || !liveRide) {
        return socket.emit('error', {
          code: 'INVALID_RIDE',
          message: 'Ride not found'
        });
      }

      io.to(`ride_${rideId}`).emit('rideEnded', {
        rideId,
        endTime: new Date()
      });

      // Notify all passengers individually
      liveRide.passengers.forEach(passenger => {
        io.to(`user_${passenger.user}`).emit('passengerRideEnded', {
          rideId,
          endTime: new Date()
        });
      });

      // Cleanup rooms
      io.socketsLeave(`ride_${rideId}`);

    } catch (error) {
      socket.emit('error', {
        code: 'END_FAILED',
        message: 'Failed to end ride'
      });
    }
  });

  // Passenger Join Ride
  socket.on('passengerJoined', async (rideId) => {
    try {
      const passengerId = socket.user.id;
      const ride = await Ride.findById(rideId).populate('driver', 'name vehicle');
      const liveRide = await LiveRideTracking.findOne({ rideId });
      
      if (!ride || !liveRide) {
        return socket.emit('error', {
          code: 'RIDE_NOT_FOUND',
          message: 'Ride not found'
        });
      }

      // Verify passenger is accepted
      const isPassenger = liveRide.passengers.some(
        p => p.user.toString() === passengerId && p.status === 'accepted'
      );

      if (!isPassenger) {
        return socket.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Not an accepted passenger'
        });
      }

      socket.join(`ride_${rideId}`);
      
      io.to(socket.id).emit('rideDetails', {
        driver: ride.driver,
        vehicle: ride.driver.vehicle,
        from: ride.from,
        to: ride.to,
        currentLocation: liveRide.locations.slice(-1)[0] || null
      });

    } catch (error) {
      socket.emit('error', {
        code: 'JOIN_FAILED',
        message: 'Failed to join ride'
      });
    }
  });

  // Location Updates (Driver Only)
  socket.on('updateLocation', async ({ rideId, location }) => {
    try {
      const driverId = socket.user.id;
      const liveRide = await LiveRideTracking.findOne({ rideId });

      if (!liveRide || liveRide.driverId.toString() !== driverId) {
        return socket.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Only driver can update locations'
        });
      }

      const newLocation = {
        ...location,
        timestamp: new Date()
      };

      await LiveRideTracking.updateOne(
        { rideId },
        { $push: { locations: newLocation } }
      );

      io.to(`ride_${rideId}`).emit('locationUpdated', {
        rideId,
        location: newLocation,
        sequence: liveRide.locations.length + 1
      });

    } catch (error) {
      socket.emit('error', {
        code: 'LOCATION_UPDATE_FAILED',
        message: 'Failed to update location'
      });
    }
  });
};