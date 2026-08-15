import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './admin-login.css';

const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0d0f12');
    tg.setBackgroundColor('#0d0f12');
  } catch (_) {}
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

const removeSplash = () => {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('hidden');
    window.setTimeout(() => splash.remove(), 180);
  }
};

window.setTimeout(removeSplash, 40);
window.addEventListener('load', removeSplash, { once: true });
