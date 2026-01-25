import '../index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const rootElement = document.getElementById('root')!;
const loadingScreen = document.getElementById('loading-screen');

// Hide loading screen once React is ready to render
if (loadingScreen) {
  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
  });
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
