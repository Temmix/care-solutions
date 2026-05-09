import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { initRum } from './lib/rum';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

initRum();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
