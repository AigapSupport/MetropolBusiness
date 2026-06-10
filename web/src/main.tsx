import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './theme/global.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Kök eleman (#root) bulunamadı.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
