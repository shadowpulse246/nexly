// script.js

const socket = io();
let currentRoom = "general";
let username = "";
let profilePic = "";
let typingTimeout;
let isTyping = false;

const loginScreen = document.getElementById("login-screen");
const startChatBtn = document.getElementById("start-chat-btn");
const appDiv = document.getElementById("app");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messages = document.getElementById("messages");
const roomList = document.getElementById("room-list");
const chatHeader = document.getElementById("chat-header");
const userDisplay = document.getElementById("user-display");
const typingIndicator = document.getElementById("typing-indicator");
const blessingCountSpan = document.getElementById("blessing-count");
const notifySound = document.getElementById("notify-sound");

let blessingCount = 0;

function joinRoom(room) {
  if (room === currentRoom) return;
  socket.emit("join-room", room, currentRoom);
  currentRoom = room;
  chatHeader.innerText = `# ${room}`;
  messages.innerHTML = "";
  typingIndicator.innerText = "";
  updateActiveRoomUI();
}

function updateActiveRoomUI() {
  document.querySelectorAll("#room-list li").forEach(li => li.classList.remove("active"));
  const activeLi = document.querySelector(`[data-room="${currentRoom}"]`);
  if (activeLi) activeLi.classList.add("active");
}

function appendMessage(name, message, pic, self = false, time = new Date().toLocaleTimeString()) {
  const messageEl = document.createElement("div");
  messageEl.classList.add("message");

  const profile = pic ? `<img src="${pic}" class="profile-pic">` : `<div class="profile-pic"></div>`;
  const content = `
    ${profile}
    <div class="message-content">
      <strong>${name}</strong>
      <div>${message}</div>
      <div class="timestamp">${time}</div>
    </div>
  `;
  messageEl.innerHTML = content;
  messages.appendChild(messageEl);
  messages.scrollTop = messages.scrollHeight;

  if (!self) {
    notifySound.currentTime = 0;
    notifySound.play();
  }
}

messageForm.addEventListener("submit", e => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (!msg) return;
  appendMessage("You", msg, profilePic, true);
  socket.emit("send-chat-message", {
    room: currentRoom,
    message: msg,
    name: username,
    pic: profilePic,
  });
  messageInput.value = "";
  if (currentRoom === "blessings") {
    blessingCount++;
    blessingCountSpan.innerText = blessingCount;
  }
});

messageInput.addEventListener("input", () => {
  if (!isTyping) {
    isTyping = true;
    socket.emit("typing", { room: currentRoom, name: username });
  }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTyping = false;
    socket.emit("stop-typing", { room: currentRoom, name: username });
  }, 1000);
});

roomList.addEventListener("click", e => {
  if (e.target.tagName === "LI") {
    joinRoom(e.target.dataset.room);
  }
});

startChatBtn.addEventListener("click", () => {
  username = document.getElementById("username-input").value.trim();
  profilePic = document.getElementById("profile-pic-input").value.trim();
  if (!username) return alert("Enter your name");
  loginScreen.classList.add("hidden");
  appDiv.classList.remove("hidden");
  userDisplay.innerText = username;
  socket.emit("user-joined", username);
  joinRoom(currentRoom);
});

socket.on("chat-message", data => {
  appendMessage(data.name, data.message, data.pic);
  if (currentRoom === "blessings") {
    blessingCount++;
    blessingCountSpan.innerText = blessingCount;
  }
});

socket.on("chat-history", messagesList => {
  messages.innerHTML = "";
  messagesList.forEach(msg => {
    appendMessage(msg.name, msg.message, msg.pic, false, msg.time);
  });
  if (currentRoom === "blessings") {
    blessingCount = messagesList.length;
    blessingCountSpan.innerText = blessingCount;
  } else {
    blessingCountSpan.innerText = "";
  }
});

socket.on("typing", data => {
  if (data.name !== username && data.room === currentRoom) {
    typingIndicator.innerText = `${data.name} is typing...`;
  }
});

socket.on("stop-typing", data => {
  if (data.name !== username && data.room === currentRoom) {
    typingIndicator.innerText = "";
  }
});
