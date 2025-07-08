const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SERVERS_DIR = path.join(DATA_DIR, "servers");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(SERVERS_DIR)) fs.mkdirSync(SERVERS_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([
  { username: "Owner", password: "adminpass", profilePic: "", isOwner: true }
], null, 2));

// Helpers
const loadJSON = file => JSON.parse(fs.readFileSync(file, "utf8"));
const saveJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

app.use(express.static(PUBLIC_DIR));
app.use(express.json());

app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.get("/login.html", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "login.html")));
app.get("/signup.html", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "signup.html")));
app.get("/bible.html", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "bible.html")));
app.get("/admin.html", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "admin.html")));
app.get("/premium.html", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "premium.html")));
app.get("/settings.html", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "settings.html")));
app.get("/tos.html", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "tos.html")));
app.get("/privacy.html", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "privacy.html")));

// Auth
app.post("/signup", (req, res) => {
  const { username, password, profilePic } = req.body;
  if (!username || !password) return res.json({ success: false, message: "Username & password required" });
  const users = loadJSON(USERS_FILE);
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.json({ success: false, message: "Username taken" });
  }
  users.push({ username, password, profilePic: profilePic||"", isOwner: false });
  saveJSON(USERS_FILE, users);
  res.json({ success: true });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadJSON(USERS_FILE);
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.json({ success: false, message: "Invalid credentials" });
  res.json({ success: true, user });
});

// Servers API
app.get("/servers", (req, res) => {
  const servers = fs.readdirSync(SERVERS_DIR).map(id => {
    const file = path.join(SERVERS_DIR, id, "server.json");
    if (!fs.existsSync(file)) return null;
    return loadJSON(file);
  }).filter(Boolean);
  res.json(servers);
});

app.post("/servers", (req, res) => {
  const { name, icon, owner } = req.body;
  if (!name || !owner) return res.json({ success: false, message: "Name and owner required" });
  const id = name.toLowerCase().replace(/\W/g, "") + Date.now();
  const serverPath = path.join(SERVERS_DIR, id);
  if (!fs.existsSync(serverPath)) fs.mkdirSync(serverPath, { recursive: true });
  saveJSON(path.join(serverPath, "server.json"), { id, name, icon, owner, created: new Date().toISOString() });
  saveJSON(path.join(serverPath, "chat.json"), []);
  res.json({ success: true, server: { id, name, icon, owner } });
});

// Socket.io
io.on("connection", socket => {
  let currentServer = null;

  socket.on("join-server", serverId => {
    if (currentServer) socket.leave(currentServer);
    currentServer = serverId;
    socket.join(serverId);
    const chatFile = path.join(SERVERS_DIR, serverId, "chat.json");
    if (fs.existsSync(chatFile)) {
      socket.emit("chat-history", loadJSON(chatFile));
    } else {
      socket.emit("chat-history", []);
    }
  });

  socket.on("send-chat-message", data => {
    const msg = {
      name: data.name,
      message: data.message,
      pic: data.pic || "",
      time: new Date().toISOString(),
    };
    io.to(data.room).emit("chat-message", msg);
    const chatFile = path.join(SERVERS_DIR, data.room, "chat.json");
    let messages = [];
    if (fs.existsSync(chatFile)) messages = loadJSON(chatFile);
    messages.push(msg);
    saveJSON(chatFile, messages);
  });

  socket.on("typing", data => {
    socket.to(data.room).emit("typing", data);
  });

  socket.on("stop-typing", data => {
    socket.to(data.room).emit("stop-typing", data);
  });
});

server.listen(PORT, () => console.log(`✅ Vervra running at http://localhost:${PORT}`));
