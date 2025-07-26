const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'AI Interview Simulator Backend is running' });
});

const interviewRoutes = require('./routes/interview');
const speechRoutes = require('./routes/speech');

app.use('/api/interview', interviewRoutes);
app.use('/api/speech', speechRoutes);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-interview', (interviewId) => {
    socket.join(interviewId);
    console.log(`Socket ${socket.id} joined interview room ${interviewId}`);
  });

  socket.on('audio-data', (data) => {
    socket.to(data.interviewId).emit('audio-data', data);
  });

  socket.on('interview-message', (data) => {
    io.to(data.interviewId).emit('interview-message', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});