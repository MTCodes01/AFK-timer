const WORK_DURATION_MS = 60 * 60 * 1000;
const BREAK_DURATION_MS = 10 * 60 * 1000;
const CYCLE_DURATION_MS = WORK_DURATION_MS + BREAK_DURATION_MS;
const STATE_KEY = "timerState";
const ALARM_NAME = "phase-end";

let operationQueue = Promise.resolve();

function enqueue(operation) {
  const result = operationQueue.then(operation);
  operationQueue = result.catch((error) => {
    console.error("AFK Timer background operation failed:", error);
  });
  return result;
}

function createIdleState() {
  return {
    phase: null,
    status: "idle",
    endAt: null,
    remainingMs: WORK_DURATION_MS
  };
}

async function loadState() {
  const stored = await chrome.storage.local.get(STATE_KEY);
  return stored[STATE_KEY] || createIdleState();
}

async function saveState(state) {
  await chrome.storage.local.set({ [STATE_KEY]: state });
  return state;
}

async function scheduleState(state) {
  if (state.status === "running" && Number.isFinite(state.endAt)) {
    chrome.alarms.create(ALARM_NAME, { when: state.endAt });
  } else {
    await chrome.alarms.clear(ALARM_NAME);
  }
}

async function notifyPhase(phase) {
  const isWork = phase === "work";
  await chrome.notifications.create({
    type: "basic",
    iconUrl: "icon-128.png",
    title: isWork ? "Focus session started" : "Break time",
    message: isWork
      ? "Time to focus for 60 minutes. You’ve got this!"
      : "Your 10-minute break has started. Step away and recharge."
  });
}

async function advanceExpiredPhase(state, now = Date.now()) {
  if (state.status !== "running" || now < state.endAt) {
    return state;
  }

  const firstPhase = state.phase === "work" ? "break" : "work";
  const firstDuration = firstPhase === "work" ? WORK_DURATION_MS : BREAK_DURATION_MS;
  const elapsedSinceBoundary = now - state.endAt;
  let phase;
  let endAt;

  if (elapsedSinceBoundary < firstDuration) {
    phase = firstPhase;
    endAt = state.endAt + firstDuration;
  } else {
    const secondPhase = firstPhase === "work" ? "break" : "work";
    const secondDuration = secondPhase === "work" ? WORK_DURATION_MS : BREAK_DURATION_MS;
    const elapsedAfterFirstPhase = elapsedSinceBoundary - firstDuration;
    const cyclePosition = elapsedAfterFirstPhase % CYCLE_DURATION_MS;
    const cycleStart = state.endAt
      + firstDuration
      + Math.floor(elapsedAfterFirstPhase / CYCLE_DURATION_MS) * CYCLE_DURATION_MS;

    if (cyclePosition < secondDuration) {
      phase = secondPhase;
      endAt = cycleStart + secondDuration;
    } else {
      phase = firstPhase;
      endAt = cycleStart + CYCLE_DURATION_MS;
    }
  }

  const nextState = await saveState({
    phase,
    status: "running",
    endAt,
    remainingMs: null
  });

  await scheduleState(nextState);
  await notifyPhase(phase);
  return nextState;
}

async function reconcileState(state) {
  if (state.status === "running") {
    if (!Number.isFinite(state.endAt)) {
      throw new Error("Running timer is missing its end time.");
    }

    if (Date.now() >= state.endAt) {
      return advanceExpiredPhase(state);
    }

    await scheduleState(state);
    return state;
  }

  await scheduleState(state);
  return state;
}

async function initialize() {
  let state = await loadState();
  const stored = await chrome.storage.local.get(STATE_KEY);
  if (!stored[STATE_KEY]) {
    state = await saveState(state);
  }
  await reconcileState(state);
}

async function handleMessage(message) {
  let state = await loadState();
  state = await reconcileState(state);

  switch (message?.type) {
    case "getState":
      return state;

    case "start":
      if (state.status !== "idle") {
        return state;
      }
      state = await saveState({
        phase: "work",
        status: "running",
        endAt: Date.now() + WORK_DURATION_MS,
        remainingMs: null
      });
      await scheduleState(state);
      return state;

    case "pause":
      if (state.status !== "running") {
        return state;
      }
      state = await saveState({
        phase: state.phase,
        status: "paused",
        endAt: null,
        remainingMs: Math.max(0, state.endAt - Date.now())
      });
      await scheduleState(state);
      return state;

    case "resume":
      if (state.status !== "paused") {
        return state;
      }
      state = await saveState({
        phase: state.phase,
        status: "running",
        endAt: Date.now() + state.remainingMs,
        remainingMs: null
      });
      await scheduleState(state);
      return state;

    case "skip": {
      if (state.status === "idle") {
        return state;
      }
      const phase = state.phase === "work" ? "break" : "work";
      const duration = phase === "work" ? WORK_DURATION_MS : BREAK_DURATION_MS;
      const isPaused = state.status === "paused";
      state = await saveState({
        phase,
        status: state.status,
        endAt: isPaused ? null : Date.now() + duration,
        remainingMs: isPaused ? duration : null
      });
      await scheduleState(state);
      await notifyPhase(phase);
      return state;
    }

    default:
      throw new Error("Unsupported timer command.");
  }
}

chrome.runtime.onInstalled.addListener(() => {
  enqueue(initialize);
});

chrome.runtime.onStartup.addListener(() => {
  enqueue(initialize);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    enqueue(async () => reconcileState(await loadState())).catch((error) => {
      console.error("Unable to advance timer phase:", error);
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  enqueue(() => handleMessage(message)).then(
    (state) => sendResponse({ state }),
    (error) => {
      console.error("Unable to process timer command:", error);
      sendResponse({ error: "The timer could not be updated. Please try again." });
    }
  );
  return true;
});

enqueue(initialize);
