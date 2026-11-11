import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TaxPage } from './pages/TaxPage';
import { DEFAULT_MUNICIPALITY, MUNICIPALITIES } from './data/municipalities';
import './styles/app.css';

// どの市町村のページかは HTML の <div id="root" data-municipality="団体コード"> で決める
const rootEl = document.getElementById('root')!;
const code = rootEl.dataset.municipality ?? DEFAULT_MUNICIPALITY;
const municipality = MUNICIPALITIES.find((m) => m.code === code) ?? MUNICIPALITIES.find((m) => m.code === DEFAULT_MUNICIPALITY)!;

createRoot(rootEl).render(
  <StrictMode>
    <TaxPage municipality={municipality} />
  </StrictMode>,
);
