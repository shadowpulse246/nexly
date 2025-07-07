// public/bible.js

const bibleVerses = [
  {
    text: "For I know the plans I have for you, declares the Lord...",
    ref: "Jeremiah 29:11"
  },
  {
    text: "I can do all things through Christ who strengthens me.",
    ref: "Philippians 4:13"
  },
  {
    text: "The Lord is my shepherd; I shall not want.",
    ref: "Psalm 23:1"
  },
  {
    text: "God is our refuge and strength, a very present help in trouble.",
    ref: "Psalm 46:1"
  },
  {
    text: "Be strong and courageous. Do not be afraid...",
    ref: "Joshua 1:9"
  }
];

function getRandomVerse() {
  return bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
}

function displayVerse() {
  const verse = getRandomVerse();
  const verseBox = document.getElementById("bible-verse");
  verseBox.innerHTML = `
    <div class="verse-text">"${verse.text}"</div>
    <div class="verse-ref">— ${verse.ref}</div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const verseBtn = document.getElementById("verse-btn");
  if (verseBtn) verseBtn.addEventListener("click", displayVerse);
  displayVerse(); // show verse on load
});
