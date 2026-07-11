// Service worker da PWA "Plataforma de Fichas Cadastrais".
// Estratégia deliberadamente simples e segura: só cacheia arquivos estáticos
// do próprio site (HTML/JS/CSS/ícones), para abrir mais rápido e funcionar
// minimamente offline. NUNCA intercepta chamadas de API (POST) nem domínios
// externos (Supabase, Mercado Pago, Z-API) — essas sempre vão direto pra rede.

const CACHE_NAME = 'fichas-app-shell-v1';
const ARQUIVOS_ESSENCIAIS = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes.filter((nome) => nome !== CACHE_NAME).map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Só mexemos em GET de mesmo domínio. Tudo mais (POST das APIs, chamadas
  // pro Supabase, Mercado Pago, Z-API, etc.) passa direto, sem cache.
  const url = new URL(request.url);
  const mesmaOrigem = url.origin === self.location.origin;
  if (request.method !== 'GET' || !mesmaOrigem) {
    return;
  }

  // Não cacheia as rotas de API do próprio site.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((resposta) => {
        // Atualiza o cache com a versão mais recente sempre que a rede funcionar.
        const clone = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return resposta;
      })
      .catch(() => caches.match(request).then((cacheado) => cacheado || caches.match('/')))
  );
});
