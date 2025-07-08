// Sample Bible verses data (replace with full data or API later)
const bibleVerses = [
  { text: "For God so loved the world...", ref: "John 3:16", moods: ["love", "hope"] },
  { text: "I can do all things through Christ...", ref: "Philippians 4:13", moods: ["strength", "encouragement"] },
  { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1", moods: ["comfort", "peace"] },
  { text: "Trust in the Lord with all your heart...", ref: "Proverbs 3:5", moods: ["trust", "faith"] },
  // Add many more verses here
];

// Get a random verse
function getRandomVerse() {
  const index = Math.floor(Math.random() * bibleVerses.length);
  return bibleVerses[index];
}

// Get verse by mood
function getMoodVerse(mood) {
  const filtered = bibleVerses.filter((v) => v.moods.includes(mood.toLowerCase()));
  if (filtered.length === 0) return null;
  const index = Math.floor(Math.random() * filtered.length);
  return filtered[index];
}

// Display daily verse based on date
function showDailyVerse() {
  const dailyVerseDiv = document.getElementById("dailyVerse");
  if (!dailyVerseDiv) return;

  // Simple daily verse by date index
  const day = new Date().getDate();
  const index = day % bibleVerses.length;
  const verse = bibleVerses[index];

  dailyVerseDiv.textContent = `"${verse.text}" — ${verse.ref}`;
}

// You can expand this file with API calls or richer features later.
document.addEventListener("DOMContentLoaded", () => {
  // Show daily verse on page load
  showDailyVerse();

  // Example usage of getting a random verse
  const randomVerse = getRandomVerse();
  console.log("Random Verse:", randomVerse);

  // Example usage of getting a mood verse
  const mood = "love"; // Change this to test different moods
  const moodVerse = getMoodVerse(mood);
  if (moodVerse) {
    console.log(`Verse for mood "${mood}":`, moodVerse);
  } else {
    console.log(`No verses found for mood "${mood}"`);
  }
});