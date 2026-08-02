import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const tg = window.Telegram?.WebApp;
if (tg) {
  try { tg.ready(); tg.expand(); tg.setHeaderColor('#0d0f12'); tg.setBackgroundColor('#0d0f12'); } catch (_) {}
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

// Remove the HTML splash once the admin panel owns the screen.
const removeSplash = () => {
  const splash = document.getElementById('splash');
  if (splash) { splash.classList.add('hidden'); setTimeout(() => splash.remove(), 350); }
};
setTimeout(removeSplash, 600);
window.addEventListener('load', removeSplash);
