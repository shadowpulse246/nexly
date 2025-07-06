// script.js
const socket = io();

let currentUser = null;
let currentRoom = null;
let servers = {};
let currentServerId = null;
let typingTimeout = null;

// DOM Elements
const loginModal = document.getElementById('login-modal');
const usernameInput = document.getElementById('username-input');
const profilePicInput = document.getElementById('profile-pic-input');
const loginBtn = document.getElementById('login-btn');
const app = document.getElementById('app');

const serverSidebar = document.getElementById('server-sidebar');
const serversList = document.getElementById('servers-list');
const addServerBtn = document.getElementById('add-server-btn');

const channelSidebar = document.getElementById('channel-sidebar');
const serverNameEl = document.getElementById('server-name');
const channelsList = document.getElementById('channels-list');

const chatArea = document.getElementById('chat-area');
const chatHeaderTitle = document.getElementById('channel-title');
const messagesEl = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');

const userAvatar = document.getElementById('user-avatar');
const userNameDisplay = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');

const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

// Util: format timestamp
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Show login modal
function showLogin() {
  loginModal.classList.add('active');
  app.classList.add('hidden');
}

// Hide login modal
function hideLogin() {
  loginModal.classList.remove('active');
  app.classList.remove('hidden');
}

// Add server to sidebar
function addServer(id, name) {
  if (servers[id]) return; // Already exists
  servers[id] = { id, name, channels: ['general', 'blessings', 'prayer'] };
  renderServers();
}

// Render servers in sidebar
function renderServers() {
  serversList.innerHTML = '';
  for (const id in servers) {
    const server = servers[id];
    const div = document.createElement('div');
    div.classList.add('server-icon');
    div.textContent = server.name[0].toUpperCase();
    if (id === currentServerId) div.classList.add('active');
    div.title = server.name;
    div.onclick = () => selectServer(id);
    serversList.appendChild(div);
  }
}

// Select server and show channels
function selectServer(id) {
  if (currentServerId === id) return;
  currentServerId = id;
  renderServers();
  renderChannels();
  // Select first channel by default
  selectChannel(servers[id].channels[0]);
  serverNameEl.textContent = servers[id].name;
}

// Render channels in channel sidebar
function renderChannels() {
  channelsList.innerHTML = '';
  if (!currentServerId) return;
  const server = servers[currentServerId];
  server.channels.forEach(ch => {
    const li = document.createElement('li');
    li.textContent = '# ' + ch;
    li.dataset.channel = ch;
    if (ch === currentRoom) li.classList.add('active');
    li.onclick = () => selectChannel(ch);
    channelsList.appendChild(li);
  });
}

// Select channel and load messages
function selectChannel(channel) {
  if (currentRoom === channel) return;
  currentRoom = channel;
  renderChannels();
  chatHeaderTitle.textContent = '# ' + channel;
  messagesEl.innerHTML = '';
  socket.emit('joinRoom', channel, currentUser.username, currentUser.profilePic);
  socket.emit('getMessages', channel);
}

// Render a message
function renderMessage(msg) {
  const div = document.createElement('div');
  div.classList.add('message');

  const header = document.createElement('div');
  header.classList.add('header');

  if (msg.profilePic) {
    const img = document.createElement('img');
    img.classList.add('profile-pic');
    img.src = msg.profilePic;
    img.alt = msg.username;
    header.appendChild(img);
  }

  const userSpan = document.createElement('strong');
  userSpan.textContent = msg.username;
  header.appendChild(userSpan);

  const timeSpan = document.createElement('span');
  timeSpan.classList.add('timestamp');
  timeSpan.textContent = formatTime(msg.timestamp);
  header.appendChild(timeSpan);

  div.appendChild(header);

  const content = document.createElement('div');
  content.classList.add('content');
  content.textContent = msg.text;
  div.appendChild(content);

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Clear typing indicator
function clearTyping() {
  typingIndicator.textContent = '';
}

// Handle typing indicator timeout
function resetTypingTimeout() {
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stopTyping', { room: currentRoom, username: currentUser.username });
  }, 2000);
}

// Event: Login
loginBtn.onclick = () => {
  const username = usernameInput.value.trim();
  if (!username) return alert('Please enter a username');
  const profilePic = profilePicInput.value.trim() || '';

  currentUser = { username, profilePic };
  userNameDisplay.textContent = username;
  userAvatar.src = profilePic || 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

  hideLogin();
  addServer('default', 'Nexly'); // Add default server
  selectServer('default');
};

// Event: Logout
logoutBtn.onclick = () => {
  currentUser = null;
  currentRoom = null;
  currentServerId = null;
  messagesEl.innerHTML = '';
  typingIndicator.textContent = '';
  usernameInput.value = '';
  profilePicInput.value = '';
  showLogin();
};

// Message form submit
messageForm.onsubmit = e => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  if (!currentRoom) return alert('Select a channel first.');

  const msg = {
    username: currentUser.username,
    profilePic: currentUser.profilePic,
    text,
    room: currentRoom,
  };

  socket.emit('sendMessage', msg);
  messageInput.value = '';
  socket.emit('stopTyping', { room: currentRoom, username: currentUser.username });
};

// Socket events

// Receive messages history
socket.on('roomMessages', messages => {
  messagesEl.innerHTML = '';
  messages.forEach(renderMessage);
});

// Receive new message
socket.on('newMessage', msg => {
  if (msg.room !== currentRoom) return;
  renderMessage(msg);
});

// Typing events
messageInput.addEventListener('input', () => {
  if (!currentRoom) return;
  socket.emit('typing', { room: currentRoom, username: currentUser.username });
  resetTypingTimeout();
});

socket.on('typing', ({ username }) => {
  if (username === currentUser.username) return;
  typingIndicator.textContent = `${username} is typing...`;
});

socket.on('stopTyping', ({ username }) => {
  if (username === currentUser.username) return;
  clearTyping();
});

// Add server button (basic prompt)
addServerBtn.onclick = () => {
  const name = prompt('Enter server name:');
  if (!name) return;
  const id = name.toLowerCase().replace(/\s+/g, '-');
  addServer(id, name);
  selectServer(id);
};

// Init
showLogin();
