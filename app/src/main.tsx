import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TaxPage } from './pages/TaxPage';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TaxPage />
  </StrictMode>,
);
