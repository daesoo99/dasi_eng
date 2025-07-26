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
  console.log('클라이언트 연결됨:', socket.id);

  socket.on('join-interview', (interviewId) => {
    socket.join(interviewId);
    console.log(`소켓 ${socket.id}이 면접방 ${interviewId}에 참가`);
  });

  socket.on('audio-data', (data) => {
    socket.to(data.interviewId).emit('audio-data', data);
  });

  socket.on('interview-message', (data) => {
    io.to(data.interviewId).emit('interview-message', data);
  });

  socket.on('disconnect', () => {
    console.log('클라이언트 연결 해제됨:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
});