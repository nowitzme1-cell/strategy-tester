
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log('QuantLeap Terminal: Initializing Bootstrap...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical: Root element #root not found in DOM.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('QuantLeap Terminal: React mounted successfully.');
  } catch (err) {
    console.error('QuantLeap Terminal: Failed to mount React app:', err);
    rootElement.innerHTML = `<div style="padding: 20px; color: white; font-family: sans-serif;">
      <h1>System Error</h1>
      <p>Failed to initialize application. Please check browser console (F12) for details.</p>
    </div>`;
  }
}
