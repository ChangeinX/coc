import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Log the commit hash when the application loads to aid debugging
if (import.meta.env.VITE_COMMIT_HASH) {
  console.log('Build commit:', import.meta.env.VITE_COMMIT_HASH);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
