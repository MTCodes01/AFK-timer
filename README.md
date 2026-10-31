# AFK Timer

AFK Timer is a Chrome productivity extension with a 60-minute focus session followed by a 10-minute break. It automatically alternates between work and break sessions, even when its popup is closed, and sends a browser notification at each transition.

## Features

- Start, pause, resume, or skip the current phase.
- Keep timer state across popup closures and browser restarts.
- Receive notifications when work or break time begins.
- Switch between dark and light themes.

## Install in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this project directory.
4. Open the AFK Timer toolbar button to start a focus session.

The extension uses Manifest V3, `chrome.alarms` for background scheduling, `chrome.storage.local` for timer state, and `chrome.notifications` for phase reminders. No external libraries or network access are required.
