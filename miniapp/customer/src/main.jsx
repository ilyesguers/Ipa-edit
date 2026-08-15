import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './login.css';
import './topup.css';

const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
    tg.setHeaderColor('#0d0f12');
    tg.setBackgroundColor('#0d0f12');
  } catch (_) {}
}

const removeSplash = () => {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('hidden');
    window.setTimeout(() => splash.remove(), 180);
  }
};

// StrictMode intentionally stays out of this production-style mini app: its
// development double-effect behavior triggers duplicate auth/category calls
// and makes slow mobile testing look like a Railway lag issue.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// React owns the initial language gate immediately; don't hold it behind a
// decorative loading screen for an arbitrary 600 ms.
window.setTimeout(removeSplash, 40);
window.addEventListener('load', removeSplash, { once: true });
