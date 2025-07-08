// Connect to Socket.io
const socket = io();

// DOM Elements
const serversList = document.getElementById("serversList");
const channelsList = document.getElementById("channelsList");
const addServerBtn = document.getElementById("addServerBtn");
const addChannelBtn = document.getElementById("addChannelBtn");
const userNameSpan = document.getElementById("userName");
const userPicImg = document.getElementById("userPic");
const ownerBadge = document.getElementById("ownerBadge");
const logoutBtn = document.getElementById("logoutBtn");

const chatPage = document.getElementById("chatPage");
const biblePage = document.getElementById("biblePage");
const premiumPage = document.getElementById("premiumPage");
const settingsPage = document.getElementById("settingsPage");
const adminPage = document.getElementById("adminPage");
const adminNavBtn = document.getElementById("adminNavBtn");

const pages = [chatPage, biblePage, premiumPage, settingsPage, adminPage];

const messagesUl = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const typingIndicator = document.getElementById("typingIndicator");

const randomVerseBtn = document.getElementById("randomVerseBtn");
const randomVerseDiv = document.getElementById("randomVerse");
const moodSelect = document.getElementById("moodSelect");
const moodVerseBtn = document.getElementById("moodVerseBtn");
const moodVerseDiv = document.getElementById("moodVerse");
const dailyVerseDiv = document.getElementById("dailyVerse");

const profilePicInput = document.getElementById("profilePicInput");
const displayNameInput = document.getElementById("displayNameInput");
const settingsForm = document.getElementById("settingsForm");

const bottomNav = document.querySelector(".bottom-nav");

// Current state
let currentUser = null;
let currentServer = null;
let currentChannel = null;
let typingTimeout = null;
let isTyping = false;

// Constants
const OWNER_USERNAME = "Owner"; // Change to your actual owner username

// Initialize app
function init() {
  loadAccount();
  if (!currentUser) {
    // Redirect to login if no account
    window.location.href = "login.html";
    return;
  }
  setupUI();
  loadServers();
  switchPage("chatPage");
  setupSocket();
  setupEventListeners();
  showDailyVerse(); // From bible.js
}

function loadAccount() {
  const saved = localStorage.getItem("vervraUser");
  if (saved) {
    currentUser = JSON.parse(saved);
  }
}

function saveAccount() {
  localStorage.setItem("vervraUser", JSON.stringify(currentUser));
}

function setupUI() {
  userNameSpan.textContent = currentUser.name;
  userPicImg.src = currentUser.pic || "default-profile.png";
  profilePicInput.value = currentUser.pic || "";
  displayNameInput.value = currentUser.name;

  if (currentUser.name === OWNER_USERNAME) {
    ownerBadge.style.display = "inline-block";
    adminPage.style.display = "block";
    adminNavBtn.style.display = "inline-block";
  } else {
    ownerBadge.style.display = "none";
    adminPage.style.display = "none";
    adminNavBtn.style.display = "none";
  }
}

function loadServers() {
  // Load servers from localStorage or init default
  let servers = JSON.parse(localStorage.getItem("vervraServers")) || [];

  if (servers.length === 0) {
    servers = [
      {
        id: "general",
        name: "General",
        channels: [{ id: "general-chat", name: "general-chat" }],
      },
    ];
    localStorage.setItem("vervraServers", JSON.stringify(servers));
  }

  // Populate servers list
  serversList.innerHTML = "";
  servers.forEach((server) => {
    const li = document.createElement("li");
    li.textContent = server.name;
    li.dataset.id = server.id;
    li.classList.toggle("active", currentServer === server.id);
    li.addEventListener("click", () => {
      if (currentServer !== server.id) {
        switchServer(server.id);
      }
    });
    serversList.appendChild(li);
  });

  if (!currentServer) {
    switchServer(servers[0].id);
  }
}

function saveServers(servers) {
  localStorage.setItem("vervraServers", JSON.stringify(servers));
}

function switchServer(serverId) {
  const servers = JSON.parse(localStorage.getItem("vervraServers")) || [];
  const server = servers.find((s) => s.id === serverId);
  if (!server) return;
  currentServer = serverId;

  // Update UI active states
  [...serversList.children].forEach((li) =>
    li.classList.toggle("active", li.dataset.id === serverId)
  );

  // Load channels for server
  loadChannels(server.channels);

  // Auto-switch to first channel
  if (server.channels.length > 0) {
    switchChannel(server.channels[0].id);
  }
}

function loadChannels(channels) {
  channelsList.innerHTML = "";
  channels.forEach((channel) => {
    const li = document.createElement("li");
    li.textContent = "#" + channel.name;
    li.dataset.id = channel.id;
    li.classList.toggle("active", currentChannel === channel.id);
    li.addEventListener("click", () => {
      if (currentChannel !== channel.id) {
        switchChannel(channel.id);
      }
    });
    channelsList.appendChild(li);
  });
}

function switchChannel(channelId) {
  currentChannel = channelId;
  [...channelsList.children].forEach((li) =>
    li.classList.toggle("active", li.dataset.id === channelId)
  );
  messagesUl.innerHTML = "";
  socket.emit("join-room", channelId, null);
  loadChatHistory(channelId);
}

function loadChatHistory(channelId) {
  // This will be sent by socket on join-room event
  // Messages loaded in socket 'chat-history' handler
}

function setupSocket() {
  socket.on("chat-history", (messages) => {
    messagesUl.innerHTML = "";
    messages.forEach((msg) => {
      addMessage(msg);
    });
  });

  socket.on("chat-message", (msg) => {
    addMessage(msg);
  });

  socket.on("typing", (data) => {
    if (data.name !== currentUser.name) {
      typingIndicator.textContent = `${data.name} is typing...`;
    }
  });

  socket.on("stop-typing", (data) => {
    typingIndicator.textContent = "";
  });
}

function addMessage(msg) {
  const li = document.createElement("li");

  const pic = document.createElement("img");
  pic.classList.add("profile-pic");
  pic.src = msg.pic || "default-profile.png";
  pic.alt = msg.name;

  const content = document.createElement("div");
  content.classList.add("message-content");

  const header = document.createElement("div");
  header.style.marginBottom = "4px";
  const nameSpan = document.createElement("b");
  nameSpan.textContent = msg.name;
  const timeSpan = document.createElement("small");
  timeSpan.textContent = new Date(msg.time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  header.appendChild(nameSpan);
  header.appendChild(timeSpan);

  const messageText = document.createElement("span");
  messageText.textContent = msg.message;

  content.appendChild(header);
  content.appendChild(messageText);

  li.appendChild(pic);
  li.appendChild(content);

  messagesUl.appendChild(li);
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;
  const data = {
    name: currentUser.name,
    message,
    pic: currentUser.pic,
    room: currentChannel,
  };
  socket.emit("send-chat-message", data);
  messageInput.value = "";
  socket.emit("stop-typing", { name: currentUser.name, room: currentChannel });
});

messageInput.addEventListener("input", () => {
  if (!isTyping) {
    socket.emit("typing", { name: currentUser.name, room: currentChannel });
    isTyping = true;
  }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stop-typing", { name: currentUser.name, room: currentChannel });
    isTyping = false;
  }, 1000);
});

// Server/channel add buttons
addServerBtn.addEventListener("click", () => {
  const name = prompt("Enter new server name:");
  if (!name) return;
  const servers = JSON.parse(localStorage.getItem("vervraServers")) || [];
  const id = name.toLowerCase().replace(/\s+/g, "-");
  if (servers.find((s) => s.id === id)) {
    alert("Server with that name already exists.");
    return;
  }
  servers.push({ id, name, channels: [{ id: `${id}-general`, name: "general" }] });
  localStorage.setItem("vervraServers", JSON.stringify(servers));
  loadServers();
  switchServer(id);
});

addChannelBtn.addEventListener("click", () => {
  const name = prompt("Enter new channel name:");
  if (!name) return;
  const servers = JSON.parse(localStorage.getItem("vervraServers")) || [];
  const server = servers.find((s) => s.id === currentServer);
  if (!server) return;
  const id = name.toLowerCase().replace(/\s+/g, "-");
  if (server.channels.find((ch) => ch.id === id)) {
    alert("Channel with that name already exists.");
    return;
  }
  server.channels.push({ id, name });
  localStorage.setItem("vervraServers", JSON.stringify(servers));
  loadChannels(server.channels);
});

// Page navigation
bottomNav.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchPage(btn.dataset.page);
  });
});

function switchPage(pageId) {
  pages.forEach((page) => {
    page.classList.toggle("active", page.id === pageId);
  });
  // Highlight bottom nav
  bottomNav.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });
}

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("vervraUser");
  window.location.href = "login.html";
});

// Settings save/load
settingsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const newPic = profilePicInput.value.trim();
  const newName = displayNameInput.value.trim();
  if (newName.length < 3) {
    alert("Display name must be at least 3 characters.");
    return;
  }
  currentUser.pic = newPic || "default-profile.png";
  currentUser.name = newName;
  saveAccount();
  setupUI();
  alert("Settings saved! You may want to logout and login again if you changed your name.");
});

// Initialize Bible page buttons (calls from bible.js)
randomVerseBtn.addEventListener("click", () => {
  const verse = getRandomVerse();
  randomVerseDiv.textContent = `"${verse.text}" — ${verse.ref}`;
});
moodVerseBtn.addEventListener("click", () => {
  const mood = moodSelect.value;
  if (!mood) {
    alert("Please select a mood.");
    return;
  }
  const verse = getMoodVerse(mood);
  moodVerseDiv.textContent = verse ? `"${verse.text}" — ${verse.ref}` : "No verse found for that mood.";
});

// Start app
init();
