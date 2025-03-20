module.exports = (socket, io) => {
  // Start ride event
  socket.on('startRide', (data) => {
    const { rideId, driverId, userId } = data;
    console.log(`Ride ${rideId} started by driver ${driverId} for user ${userId}`);

    // Broadcast to the user that the ride has started
    io.to(userId).emit('rideStarted', { rideId, driverId });
  });

  // Update location event
  socket.on('updateLocation', (data) => {
    const { rideId, latitude, longitude } = data;
    console.log(`Ride ${rideId} location updated: ${latitude}, ${longitude}`);

    // Broadcast the updated location to the ride room
    io.to(rideId).emit('locationUpdated', { latitude, longitude });
  });

  // End ride event
  socket.on('endRide', (data) => {
    const { rideId, driverId, userId } = data;
    console.log(`Ride ${rideId} ended by driver ${driverId} for user ${userId}`);

    // Broadcast to the user that the ride has ended
    io.to(userId).emit('rideEnded', { rideId, driverId });
  });
};