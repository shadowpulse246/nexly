// Elements
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');

const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username-input');
const profilePicInput = document.getElementById('profile-pic-input');

const userNameDisplay = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');
const startChatBtn = document.getElementById('start-chat-btn');

let currentUser = null;

loginBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const profilePic = profilePicInput.value.trim();

  if (!username) {
    alert('Please enter a username!');
    return;
  }

  // If no profile pic, use default avatar
  const avatar = profilePic || 'default-avatar.png';

  currentUser = { username, avatar };

  // Show dashboard, hide login
  loginScreen.style.display = 'none';
  dashboard.style.display = 'block';

  // Update dashboard info
  userNameDisplay.textContent = username;
  userAvatar.src = avatar;
});

// Start chat button event
startChatBtn.addEventListener('click', () => {
  // Save user info to sessionStorage to share with chat page
  sessionStorage.setItem('username', currentUser.username);
  sessionStorage.setItem('avatar', currentUser.avatar);

  // Redirect to chat page (e.g., chat.html)
  window.location.href = 'index.html'; // or wherever your chat page is
});
