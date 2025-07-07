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
const ROOMS = ["general", "blessings", "prayer"];

// Ensure /data folder and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
ROOMS.forEach(room => {
  const file = path.join(DATA_DIR, `${room}.json`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
});

// Helper functions
function getMessages(room) {
  const file = path.join(DATA_DIR, `${room}.json`);
  return JSON.parse(fs.readFileSync(file));
}
function saveMessage(room, msg) {
  const file = path.join(DATA_DIR, `${room}.json`);
  const messages = getMessages(room);
  messages.push(msg);
  fs.writeFileSync(file, JSON.stringify(messages));
}

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Socket.io chat logic
io.on("connection", socket => {
  let currentRoom = "general";
  socket.join(currentRoom);
  socket.emit("chat-history", getMessages(currentRoom));

  socket.on("join-room", (newRoom, oldRoom) => {
    socket.leave(oldRoom);
    socket.join(newRoom);
    currentRoom = newRoom;
    socket.emit("chat-history", getMessages(newRoom));
  });

  socket.on("send-chat-message", data => {
    const msg = {
      name: data.name,
      message: data.message,
      pic: data.pic || "",
      time: new Date().toISOString(),
    };
    io.to(data.room).emit("chat-message", msg);
    saveMessage(data.room, msg);
  });

  socket.on("typing", data => {
    socket.to(data.room).emit("typing", data);
  });

  socket.on("stop-typing", data => {
    socket.to(data.room).emit("stop-typing", data);
  });
});

// Prevent port-in-use crash
server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Try closing other apps or change the port.`);
    process.exit(1);
  } else {
    throw err;
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ Vervra server running at http://localhost:${PORT}`);
});
