import './polyfills';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  // Temporarily disable StrictMode to prevent Web3Modal initialization timing issues
  // StrictMode causes double-rendering in development which can interfere with Web3Modal
  // TODO: Re-enable StrictMode once Web3Modal timing issues are fully resolved
  // <StrictMode>
    <App />
  // </StrictMode>
);
