// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

app.use(express.static(path.join(__dirname, "public")));

// Stores users per socket
const users = {};

// Read messages from JSON file
function loadMessages(room) {
  const file = path.join(DATA_DIR, `${room}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

// Save messages to JSON file
function saveMessage(room, message) {
  const file = path.join(DATA_DIR, `${room}.json`);
  const messages = loadMessages(room);
  messages.push(message);
  fs.writeFileSync(file, JSON.stringify(messages, null, 2));
}

io.on("connection", (socket) => {
  let currentRoom = "general";
  users[socket.id] = { username: "", pic: "" };
  socket.join(currentRoom);

  // Send chat history to new user
  socket.emit("chat-history", loadMessages(currentRoom));

  // User info on join
  socket.on("user-joined", (username) => {
    users[socket.id].username = username;
  });

  socket.on("join-room", (room, prevRoom) => {
    socket.leave(prevRoom);
    socket.join(room);
    currentRoom = room;
    socket.emit("chat-history", loadMessages(room));
  });

  socket.on("send-chat-message", (data) => {
    const msg = {
      name: data.name,
      message: data.message,
      pic: data.pic,
      time: new Date().toISOString(),
    };
    saveMessage(data.room, msg);
    socket.to(data.room).emit("chat-message", msg);
  });

  socket.on("typing", (data) => {
    socket.to(data.room).emit("typing", data);
  });

  socket.on("stop-typing", (data) => {
    socket.to(data.room).emit("stop-typing", data);
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
  });
});

server.listen(PORT, () => {
  console.log(`Vervra server is live at http://localhost:${PORT}`);
});
