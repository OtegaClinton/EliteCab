const { Server } = require('socket.io');

const socketConnect = (server) => {
  const io = new Server(server);

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle live ride tracking events
    require('./liveRideTrackingSocket')(socket, io);

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

module.exports = socketConnect;