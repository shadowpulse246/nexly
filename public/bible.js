const verses = {
  love: [
    "1 Corinthians 13:4 — Love is patient, love is kind.",
    "John 15:13 — Greater love has no one than this: to lay down one’s life for one’s friends.",
    "Romans 5:8 — God demonstrates His own love for us in this: While we were still sinners, Christ died for us.",
  ],
  fear: [
    "2 Timothy 1:7 — For God has not given us a spirit of fear, but of power and of love and of a sound mind.",
    "Isaiah 41:10 — So do not fear, for I am with you.",
    "Psalm 23:4 — Even though I walk through the darkest valley, I will fear no evil, for you are with me.",
  ],
  hope: [
    "Jeremiah 29:11 — 'For I know the plans I have for you,' declares the LORD.",
    "Romans 15:13 — May the God of hope fill you with all joy and peace.",
    "Psalm 39:7 — But now, Lord, what do I look for? My hope is in you.",
  ],
  strength: [
    "Philippians 4:13 — I can do all things through Christ who strengthens me.",
    "Nehemiah 8:10 — The joy of the Lord is your strength.",
    "Isaiah 40:31 — Those who hope in the Lord will renew their strength.",
  ],
  random: [
    "Proverbs 3:5 — Trust in the Lord with all your heart.",
    "Matthew 6:33 — But seek first His kingdom and His righteousness.",
    "James 1:5 — If any of you lacks wisdom, ask God who gives generously.",
  ],
};

function getVerseByMood(mood) {
  const list = verses[mood] || verses.random;
  return list[Math.floor(Math.random() * list.length)];
}

function getDailyVerse() {
  const allVerses = Object.values(verses).flat();
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return allVerses[dayOfYear % allVerses.length];
}

// UI Logic
document.addEventListener("DOMContentLoaded", () => {
  const dailyBox = document.getElementById("daily-verse");
  const moodSelect = document.getElementById("mood-select");
  const moodOutput = document.getElementById("mood-verse");
  const randomBtn = document.getElementById("random-btn");
  const randomOutput = document.getElementById("random-verse");

  if (dailyBox) dailyBox.textContent = getDailyVerse();

  if (moodSelect) {
    moodSelect.addEventListener("change", () => {
      const mood = moodSelect.value;
      moodOutput.textContent = getVerseByMood(mood);
    });
  }

  if (randomBtn) {
    randomBtn.addEventListener("click", () => {
      randomOutput.textContent = getVerseByMood("random");
    });
  }
});
