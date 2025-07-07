const socket = io();
const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const typingStatus = document.getElementById("typing-status");
const roomTabs = document.querySelectorAll("aside li[data-room]");
const roomName = document.querySelector(".room-name");
const userNameDisplay = document.getElementById("user-name");
const userPicDisplay = document.getElementById("user-pic");

let currentRoom = "general";
let typing = false;
let timeout;

// Get or prompt username
let username = localStorage.getItem("username");
if (!username) {
  username = prompt("Enter your name:");
  if (!username) username = "Anonymous";
  localStorage.setItem("username", username);
}

// Get or prompt profile pic
let profilePic = localStorage.getItem("profilePic");
if (!profilePic) {
  profilePic = prompt("Paste a link to your profile picture:");
  if (!profilePic) profilePic = "https://via.placeholder.com/32";
  localStorage.setItem("profilePic", profilePic);
}

userNameDisplay.textContent = username;
userPicDisplay.src = profilePic;

// Join default room
socket.emit("join-room", currentRoom, null);

// Handle incoming messages
socket.on("chat-message", msg => {
  appendMessage(msg);
  playSound();
});

// Handle chat history
socket.on("chat-history", messages => {
  chatBox.innerHTML = "";
  messages.forEach(appendMessage);
  scrollToBottom();
});

// Typing indicator
socket.on("typing", data => {
  typingStatus.textContent = `${data.name} is typing...`;
});
socket.on("stop-typing", () => {
  typingStatus.textContent = "";
});

// Form submit
chatForm.addEventListener("submit", e => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  socket.emit("send-chat-message", {
    name: username,
    message,
    room: currentRoom,
    pic: profilePic,
  });

  chatInput.value = "";
  stopTyping();
});

// Room switching
roomTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const newRoom = tab.dataset.room;
    if (newRoom === currentRoom) return;

    document.querySelector(".active")?.classList.remove("active");
    tab.classList.add("active");

    socket.emit("join-room", newRoom, currentRoom);
    currentRoom = newRoom;
    roomName.textContent = `# ${capitalize(newRoom)}`;
  });
});

// Typing
chatInput.addEventListener("input", () => {
  if (!typing) {
    typing = true;
    socket.emit("typing", { name: username, room: currentRoom });
    timeout = setTimeout(stopTyping, 1500);
  } else {
    clearTimeout(timeout);
    timeout = setTimeout(stopTyping, 1500);
  }
});

function stopTyping() {
  typing = false;
  socket.emit("stop-typing", { room: currentRoom });
}

function appendMessage({ name, message, pic, time }) {
  const div = document.createElement("div");
  div.className = "message";

  const header = `
    <div class="message-header">
      <img src="${pic}" alt="pfp" />
      ${name}
      <span class="message-time">${formatTime(time)}</span>
    </div>`;

  const content = `<div class="message-content">${escapeHTML(message)}</div>`;

  div.innerHTML = header + content;
  chatBox.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function formatTime(iso) {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[c]));
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function playSound() {
  const audio = new Audio("notification.mp3");
  audio.volume = 0.2;
  audio.play();
}
document.addEventListener("DOMContentLoaded", () => {
  // Initial room setup
  const activeTab = document.querySelector(".active");
  if (activeTab) {
    currentRoom = activeTab.dataset.room;
    roomName.textContent = `# ${capitalize(currentRoom)}`;
  }

  // Display initial verse
  displayVerse();
});