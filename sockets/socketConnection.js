const { Server } = require('socket.io');

let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: '*', // Allow all origins (adjust for production)
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log('A client connected:', socket.id);

      // Allow clients to join a room (e.g., userId or rideId)
      socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
      });

      // Handle live ride tracking events
      require('./liveRideTrackingSocket')(socket, io);

      socket.on('disconnect', () => {
        console.log('A client disconnected:', socket.id);
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.IO not initialized!');
    }
    return io;
  },
};