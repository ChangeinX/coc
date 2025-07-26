import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initOffline } from './lib/offline.js';
import { listenForSubscriptionChanges } from './lib/push.js';
import { checkForStaleBuild, detectBlankPage } from './lib/buildCheck.js';

// Log the commit hash when the application loads to aid debugging
if (import.meta.env.VITE_COMMIT_HASH) {
  console.log('Build commit:', import.meta.env.VITE_COMMIT_HASH);
}

checkForStaleBuild();
detectBlankPage();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
    initOffline();
    listenForSubscriptionChanges();
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
