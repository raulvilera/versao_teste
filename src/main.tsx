import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registra o service worker da PWA (permite instalar no celular e abrir
// mais rápido em visitas seguintes). Falha silenciosamente se o navegador
// não suportar ou se rodar fora de produção (ex: preview local sem HTTPS).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Falha ao registrar o service worker:', err);
    });
  });
}
