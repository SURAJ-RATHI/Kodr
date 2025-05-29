import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

// Get Google Client ID from environment variables
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Ensure the Google Client ID is available
if (!googleClientId) {
  console.error('VITE_GOOGLE_CLIENT_ID is not defined. Please add it to your .env.local file in the frontend.');
  // You might want to render an error message to the user here
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <div>Error: Google Client ID not configured.</div>
    )}
  </React.StrictMode>,
)
