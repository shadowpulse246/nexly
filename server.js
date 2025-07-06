// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

app.use(express.static(path.join(__dirname, 'public')));

const ROOMS = ['general', 'blessings', 'prayer'];
const typingUsers = {};

function loadMessages(room) {
  const file = path.join(DATA_DIR, `${room}.json`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
  return JSON.parse(fs.readFileSync(file));
}

function saveMessages(room, messages) {
  const file = path.join(DATA_DIR, `${room}.json`);
  fs.writeFileSync(file, JSON.stringify(messages, null, 2));
}

io.on('connection', socket => {
  socket.on('joinRoom', (room, username, profilePic) => {
    socket.join(room);
    typingUsers[room] = typingUsers[room] || new Set();
    socket.to(room).emit('newMessage', {
      username: 'System',
      profilePic: '',
      text: `${username} joined`,
      timestamp: Date.now(),
      room
    });
  });

  socket.on('getMessages', room => {
    const msgs = loadMessages(room);
    socket.emit('roomMessages', msgs);
  });

  socket.on('sendMessage', msg => {
    const messages = loadMessages(msg.room);
    const newMsg = { ...msg, timestamp: Date.now() };
    messages.push(newMsg);
    saveMessages(msg.room, messages);
    const blessCount = loadMessages('blessings').length;
    io.to(msg.room).emit('newMessage', { ...newMsg, blessingCount: blessCount });
  });

  socket.on('typing', ({ room, username }) => {
    socket.to(room).emit('typing', { room, username });
  });

  socket.on('stopTyping', ({ room, username }) => {
    socket.to(room).emit('stopTyping', { room, username });
  });

  socket.on('disconnect', () => console.log('User disconnected'));
});

server.listen(PORT, () => {
  console.log(`✅ Nexly running on http://localhost:${PORT}`);
});
