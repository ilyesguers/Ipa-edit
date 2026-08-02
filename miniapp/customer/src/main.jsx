import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Initialize Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
    tg.setHeaderColor('#000000');
    tg.setBackgroundColor('#000000');
  } catch (_) {}
}

// Remove the HTML splash the moment React owns the screen, so the app is
// never covered by the loading overlay. If anything fails, the splash stays
// visible (with branding) instead of showing a black screen.
const removeSplash = () => {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 350);
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Smoothly reveal the real app; fallback removes the splash even if React
// misbehaves so the Telegram page is never permanently blocked.
setTimeout(removeSplash, 600);
window.addEventListener('load', removeSplash);
