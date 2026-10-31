const WORK_DURATION_SECONDS = 60 * 60;
const BREAK_DURATION_SECONDS = 10 * 60;

const timerDisplay = document.getElementById("timer");
const phaseLabel = document.getElementById("phase-label");
const statusDisplay = document.getElementById("status");
const progressDisplay = document.getElementById("progress");
const messageDisplay = document.getElementById("message");
const errorDisplay = document.getElementById("error-message");
const primaryControl = document.getElementById("primary-control");
const skipControl = document.getElementById("skip-control");
const themeToggle = document.getElementById("theme-toggle");

let timerState = null;
let requestPending = false;
let refreshPending = false;

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getRemainingSeconds() {
  if (!timerState) {
    return WORK_DURATION_SECONDS;
  }
  if (timerState.status === "running") {
    return Math.max(0, Math.ceil((timerState.endAt - Date.now()) / 1000));
  }
  return Math.max(0, Math.ceil((timerState.remainingMs || 0) / 1000));
}

function render() {
  if (!timerState) {
    return;
  }

  const isWork = timerState.phase === "work";
  const isBreak = timerState.phase === "break";
  const totalSeconds = isBreak ? BREAK_DURATION_SECONDS : WORK_DURATION_SECONDS;
  const remainingSeconds = timerState.status === "idle"
    ? WORK_DURATION_SECONDS
    : getRemainingSeconds();
  const elapsedPercent = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

  timerDisplay.textContent = formatTime(remainingSeconds);
  timerDisplay.setAttribute("aria-label", `${remainingSeconds} seconds remaining`);
  phaseLabel.textContent = isWork
    ? "Focus session"
    : isBreak
      ? "Break time"
      : "Ready to focus";
  statusDisplay.textContent = timerState.status === "paused"
    ? "Paused"
    : timerState.status === "running"
      ? (isBreak ? "Take a moment to recharge" : "One thing at a time")
      : "60 min focus · 10 min break";
  progressDisplay.style.width = `${Math.min(100, Math.max(0, elapsedPercent))}%`;
  progressDisplay.dataset.phase = isBreak ? "break" : "work";
  primaryControl.textContent = timerState.status === "idle"
    ? "Start focus"
    : timerState.status === "paused"
      ? "Resume"
      : "Pause";
  skipControl.disabled = timerState.status === "idle" || requestPending;
  primaryControl.disabled = requestPending;

  if (timerState.status === "idle") {
    messageDisplay.textContent = "Make space for focused work.";
  } else if (timerState.status === "paused") {
    messageDisplay.textContent = "Your timer is paused. Resume when you’re ready.";
  } else if (isBreak) {
    messageDisplay.textContent = "Step away from your screen and recharge.";
  } else {
    messageDisplay.textContent = "Stay focused. Your break is coming.";
  }
}

function request(command) {
  requestPending = true;
  errorDisplay.hidden = true;
  render();

  chrome.runtime.sendMessage({ type: command }, (response) => {
    requestPending = false;
    if (chrome.runtime.lastError) {
      errorDisplay.textContent = "Could not reach the timer. Reopen the extension and try again.";
      errorDisplay.hidden = false;
      render();
      return;
    }
    if (response?.error) {
      errorDisplay.textContent = response.error;
      errorDisplay.hidden = false;
      render();
      return;
    }
    timerState = response.state;
    render();
  });
}

function refreshTimerState() {
  if (refreshPending) {
    return;
  }
  refreshPending = true;
  chrome.runtime.sendMessage({ type: "getState" }, (response) => {
    refreshPending = false;
    if (!chrome.runtime.lastError && response?.state) {
      timerState = response.state;
      render();
    }
  });
}

primaryControl.addEventListener("click", () => {
  if (!timerState) {
    return;
  }
  const command = timerState.status === "idle"
    ? "start"
    : timerState.status === "paused"
      ? "resume"
      : "pause";
  request(command);
});

skipControl.addEventListener("click", () => request("skip"));

themeToggle.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  themeToggle.textContent = isLightTheme ? "☾" : "☀";
  themeToggle.setAttribute("aria-pressed", String(isLightTheme));
  themeToggle.setAttribute("aria-label", isLightTheme ? "Switch to dark mode" : "Switch to light mode");
  localStorage.setItem("lightTheme", String(isLightTheme));
});

if (localStorage.getItem("lightTheme") === "true") {
  document.body.classList.add("light-theme");
  themeToggle.textContent = "☾";
  themeToggle.setAttribute("aria-pressed", "true");
  themeToggle.setAttribute("aria-label", "Switch to dark mode");
}

chrome.runtime.sendMessage({ type: "getState" }, (response) => {
  if (chrome.runtime.lastError) {
    errorDisplay.textContent = "Could not load the timer. Try reopening the extension.";
    errorDisplay.hidden = false;
    return;
  }
  if (response?.error) {
    errorDisplay.textContent = response.error;
    errorDisplay.hidden = false;
    return;
  }
  timerState = response.state;
  render();
});

setInterval(() => {
  render();
  if (timerState?.status === "running" && getRemainingSeconds() === 0) {
    refreshTimerState();
  }
}, 250);
