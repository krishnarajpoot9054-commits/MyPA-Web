# MyPA Web — Personal Assistant

A responsive web application for laptop and mobile browsers. It uses plain HTML/CSS/JavaScript, a Node.js backend, and Gemini AI through a server-side API proxy. The app has no npm package dependencies.

## Features included
- Responsive dashboard with live clock, daily tasks, classes, focus minutes and attendance overview
- Task manager with date/time/duration, natural-language task creation, completion, deletion, subtasks and basic overlap warnings
- Weekly recurring class timetable with present/absent attendance marking
- Calendar view for selected-day tasks and classes
- Gemini-powered AI chat through a server endpoint; API key is not exposed to frontend JavaScript
- Goals with target dates and manual progress tracking; task-completion streak indicator
- Pomodoro focus timer (25-minute focus, 5-minute and 15-minute breaks) with session totals
- Sleep schedule settings and planned sleep-window calculation
- Notes create/edit/delete
- Analytics for task completion, focus sessions, attendance and notes, plus text summary export
- Global search across tasks, classes, goals and notes
- Browser notification permission and due-time reminders while the website tab is open
- JSON backup export/import and local workspace reset
- Duration parser preserves 120 minutes for `120min` and `2 hours`

## Requirements
- Node.js 20 or newer recommended (Node 22 LTS is fine)
- Internet connection for Gemini AI

## Run on Windows
1. Extract the ZIP.
2. Open the inner `MyPA_Web` folder — the folder containing `package.json`, `server.js`, and `.env.example`.
3. Copy `.env.example` and rename the copy to `.env`.
4. Open `.env` in Notepad and replace the placeholder with your own Gemini API key:
   ```env
   GEMINI_API_KEY=PASTE_YOUR_NEW_KEY_HERE
   GEMINI_MODEL=gemini-3.8-flash
   PORT=3000
   ```
5. Save the file. Open PowerShell in this folder and run:
   ```powershell
   npm.cmd start
   ```
6. Open `http://localhost:3000` in Chrome. Keep the terminal open while using MyPA.

No `npm install` is required. To run duration-parser tests, use `npm.cmd test`.

## Use on your phone on the same Wi-Fi
1. Start MyPA on your laptop.
2. In Windows Command Prompt run `ipconfig` and find the laptop's IPv4 address.
3. On the phone connected to the same Wi-Fi, open `http://LAPTOP-IP:3000` (replace with the actual IPv4 address).
4. If needed, allow Node.js on Private networks in Windows Firewall. Do not expose port 3000 directly to the public internet.

## Security and important limitations
- The Gemini key is read by `server.js` from `.env` and sent to Google in the `x-goog-api-key` header. Never paste the key into `public/` files, screenshots, or chat. Do not upload `.env` to public Git repositories.
- Tasks, classes, attendance, goals, notes and settings are stored in browser `localStorage`. They persist in that browser, but do **not** automatically sync between your laptop and phone. Use Export/Import backup to transfer them manually.
- Browser reminders run only while the app tab is open. They are not guaranteed OS-level/background notifications.
- Attendance is a simple mark-per-class template in this prototype; a production-grade per-session attendance history and attendance calculator still need a database-backed model.
- There is no account/login system or cloud database in this build. Before public production deployment, add authentication, database-backed user isolation, HTTPS, secret management and stricter abuse controls.
- AI service availability depends on the configured Gemini model, API quota and Google's service status. The task manager and local modules work without AI.

## Tests
```powershell
npm.cmd test
```
