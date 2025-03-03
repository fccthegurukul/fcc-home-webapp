import React from 'react';
import ReactDOM from 'react-dom/client'; // Updated import for React 18
import './index.css';
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Create root using ReactDOM.createRoot
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);

// Register the service worker
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    console.log('New update available! Ready to refresh.');
    // Optionally, you can prompt the user to refresh the page
    if (window.confirm('New version available! Refresh to update?')) {
      window.location.reload();
    }
  },
  onSuccess: (registration) => {
    console.log('Service worker registered successfully!');
  },
});

// If you want to unregister (useful for debugging), uncomment the following line:
// serviceWorkerRegistration.unregister();