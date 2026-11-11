import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TopPage } from './pages/TopPage';
import './styles/app.css';
import './styles/top.css';

// サイトのトップページ（index.html）。市町村のページは main.tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TopPage />
  </StrictMode>,
);
