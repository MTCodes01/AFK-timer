let timerDisplay = document.getElementById("timer");
let statusDisplay = document.getElementById("status");
let messageDisplay = document.getElementById("message");
let zenDisplay = document.getElementById("zen-counter");
let themeToggle = document.getElementById("theme-toggle");
let catCompanion = document.getElementById("cat-companion");
let catMessage = document.getElementById("cat-message");
let catToggle = document.getElementById("cat-toggle");

const catState = {
  mood: "idle",
  lastActivityAt: 0
};
let catCelebrationTimeout;

const catActivityMessages = [
  "We agreed to do absolutely nothing!",
  "Seriously? Again?",
  "I was just getting comfortable.",
  "Your hands are making suspicious noises.",
  "There goes my very important nap."
];

function setCatMood(mood, message) {
  catState.mood = mood;
  catCompanion.dataset.mood = mood;
  if (message) {
    catMessage.textContent = message;
  }
}

function updateCatForStillness() {
  if (!isIdle || catState.mood === "celebrating") {
    return;
  }

  if (afkTime >= 90) {
    setCatMood("sleeping", "Finally, some peace and quiet. Zzz...");
  } else {
    catCompanion.dataset.resting = String(afkTime >= 30);
    setCatMood("idle", afkTime >= 30 ? "Okay, this is actually quite nice..." : "I'm keeping an eye on your stillness.");
  }
}

function reactToCatActivity(streakWasActive) {
  clearTimeout(catCelebrationTimeout);
  const now = Date.now();
  const repeatedActivity = now - catState.lastActivityAt < 1500;
  catState.lastActivityAt = now;

  if (streakWasActive) {
    catCompanion.dataset.resting = "false";
    setCatMood("annoyed", catActivityMessages[Math.floor(Math.random() * catActivityMessages.length)]);
  } else if (repeatedActivity) {
    setCatMood("annoyed", "Could you not? I was almost asleep.");
  } else {
    setCatMood("suspicious", "I saw that. What are you up to?");
  }
}

function celebrateCat(message) {
  clearTimeout(catCelebrationTimeout);
  setCatMood("celebrating", message);
  catCelebrationTimeout = setTimeout(() => {
    catState.mood = "";
    updateCatForStillness();
  }, 1800);
}

catToggle.addEventListener("click", () => {
  const isHidden = !catCompanion.hidden;
  catCompanion.hidden = isHidden;
  catToggle.textContent = isHidden ? "Show cat" : "Hide cat";
  catToggle.setAttribute("aria-pressed", String(isHidden));
});

themeToggle.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  themeToggle.textContent = isLightTheme ? "🌙 Dark mode" : "☀ Light mode";
  themeToggle.setAttribute("aria-pressed", String(isLightTheme));
});

let minutes = 0, seconds = 0;
let isIdle = true;
let afkTime = 0;
let zenPoints = 0;
let currentMessage = "";
let hasShownMessage = false;

const praiseMessages = [
  "You're a still-life painting.",
  "Motionless excellence!",
  "Truly doing nothing… spectacularly.",
  "Zero input. Infinite peace.",
  "Still. Silent. Supreme.",
  "Master of the art of nothingness.",
  "Professional procrastinator level achieved.",
  "Even sloths are impressed by your stillness.",
  "Congratulations on your commitment to inactivity!",
  "You've unlocked the secret of absolute stillness.",
  "The universe applauds your dedication to doing nothing.",
  "Zen masters everywhere are taking notes."
];

const disappointedMessages = [
  "🤨 Hey... you moved.",
  "😔 The magic is broken...",
  "🙄 Really? You had to move?",
  "😤 Your stillness streak is ruined!",
  "🤦 So close to enlightenment...",
  "💔 My heart breaks with your movement.",
  "😱 MOVEMENT DETECTED! ALERT! ALERT!",
  "🚨 The Department of Doing Nothing is disappointed.",
  "😿 Even cats are better at staying still.",
  "🌪️ You've disturbed the cosmic balance!",
  "🙈 I can't watch... you moved again!",
  "💸 There goes your stillness investment...",
  "🎭 The performance is ruined!",
  "⚡ Movement detected. Zen points deducted from the universe.",
  "🎪 Ladies and gentlemen, we have a mover!"
];

function updateTimer() {
  if (isIdle) {
    seconds++;
    afkTime++;
    updateCatForStillness();
    
    // Zen points every 30 seconds
    if (afkTime % 30 === 0) {
      zenPoints++;
      zenDisplay.textContent = `🧘 Zen Points: ${zenPoints}`;
      zenDisplay.style.color = '#4ecdc4';
    }

    if (seconds === 60) {
      seconds = 0;
      minutes++;
      confetti(); // burst every minute
    }

    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Show praise message only once every 30 seconds, keep it until next cycle
    if (afkTime % 30 === 0 && !hasShownMessage) {
      currentMessage = praiseMessages[Math.floor(Math.random() * praiseMessages.length)];
      messageDisplay.textContent = currentMessage;
      messageDisplay.style.color = '#ffa726';
      hasShownMessage = true;
    }

    // Special milestone celebrations
    if (afkTime === 120) { // 2 minutes
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      currentMessage = "🎉 2 MINUTES OF PURE NOTHINGNESS! LEGENDARY!";
      messageDisplay.textContent = currentMessage;
      messageDisplay.style.color = '#ff6b6b';
      celebrateCat("Two whole minutes? I’m impressed. A little.");
    }

    if (afkTime === 300) { // 5 minutes
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#ab47bc']
      });
      currentMessage = "🏆 5 MINUTES! PROFESSIONAL STATUE STATUS ACHIEVED!";
      messageDisplay.textContent = currentMessage;
      messageDisplay.style.color = '#ffd700';
      celebrateCat("Five minutes of stillness! I knew you had it in you.");
    }

    if (afkTime === 600) { // 10 minutes
      confetti({
        particleCount: 300,
        spread: 180,
        origin: { y: 0.3 },
        colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#ab47bc', '#66bb6a']
      });
      currentMessage = "👑 10 MINUTES! BOW TO THE EMPEROR/EMPRESS OF IDLENESS!";
      messageDisplay.textContent = currentMessage;
      messageDisplay.style.color = '#ffd700';
      messageDisplay.style.textShadow = '0 0 20px #ffd700';
      celebrateCat("Ten minutes! You may continue your very serious nap.");
    }
  }
}

setInterval(updateTimer, 1000);

let timeout;

function resetIdleTimer() {
  isIdle = false;
  statusDisplay.innerHTML = 'Status: <span style="color:red;">You moved</span>';
  
  // Show a unique disappointed message and keep it until idle starts again
  const disappointedMessage = disappointedMessages[Math.floor(Math.random() * disappointedMessages.length)];
  messageDisplay.textContent = disappointedMessage;
  messageDisplay.style.color = '#ff6b6b';
  messageDisplay.style.textShadow = 'none';
  
  afkTime = minutes = seconds = 0;
  timerDisplay.textContent = '00:00';
  hasShownMessage = false; // Reset flag so new message can show when idle starts

  clearTimeout(timeout);
  timeout = setTimeout(() => {
    isIdle = true;
    statusDisplay.innerHTML = 'Status: <span style="color:green;">Idle</span>';
    messageDisplay.textContent = "✨ Welcome back to the art of doing nothing!";
    messageDisplay.style.color = '#66bb6a';
    hasShownMessage = false; // Reset for new cycle
  }, 3000);
}

let isResetting = false;

function handleUserActivity() {
  reactToCatActivity(isIdle);

  if (!isResetting) {
    isResetting = true;
    resetIdleTimer();
  }

  clearTimeout(timeout);
  timeout = setTimeout(() => {
    isIdle = true;
    isResetting = false;
    statusDisplay.innerHTML = 'Status: <span style="color:green;">Idle</span>';
    messageDisplay.textContent = "✨ Welcome back to the art of doing nothing!";
    messageDisplay.style.color = '#66bb6a';
    hasShownMessage = false;
    updateCatForStillness();
  }, 500);
}

['mousemove', 'click', 'keydown', 'scroll', 'touchstart'].forEach(event =>
  document.addEventListener(event, handleUserActivity)
);

// Initialize
zenDisplay.textContent = "🧘 Zen Points: 0";
messageDisplay.textContent = "💭 Begin your journey into the void of productivity...";
messageDisplay.style.color = '#ab47bc';