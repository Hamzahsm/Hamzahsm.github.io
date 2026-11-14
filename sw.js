// Service worker NEWTON Mabar: agar aplikasi tetap bisa dibuka saat offline.
// Letakkan file ini di folder yang sama dengan mabar-newton.html (wajib HTTPS).
const CACHE = 'newton-mabar-v1';
const HOST_CDN = ['www.gstatic.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const STATIC_EXT = /\.(?:html|js|css|png|jpe?g|gif|svg|webp|ico|woff2?|json)$/i;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
        await self.clients.claim();
    })());
});

function bisaDisimpan(res) {
    return res && (res.ok || res.type === 'opaque');
}

async function simpan(req, res) {
    if (!bisaDisimpan(res)) return;
    const cache = await caches.open(CACHE);
    await cache.put(req, res.clone());
}

// Halaman: coba jaringan dulu (supaya update HTML langsung terlihat), jatuh ke cache bila offline / lambat.
async function halaman(event) {
    const req = event.request;
    const cached = await caches.match(req, { ignoreSearch: true });
    try {
        const jaringan = fetch(req).then(res => { event.waitUntil(simpan(req, res.clone())); return res; });
        if (!cached) return await jaringan;
        return await Promise.race([
            jaringan,
            new Promise((_, reject) => setTimeout(() => reject(new Error('lambat')), 4000))
        ]);
    } catch (e) {
        if (cached) return cached;
        throw e;
    }
}

// Library & font (CDN) dan aset statis: pakai cache dulu, perbarui di belakang.
async function aset(event) {
    const req = event.request;
    const cached = await caches.match(req);
    const jaringan = fetch(req).then(res => { event.waitUntil(simpan(req, res.clone())); return res; }).catch(() => null);
    if (cached) return cached;
    const res = await jaringan;
    return res || Response.error();
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    const sama = url.origin === self.location.origin;

    if (!sama && !HOST_CDN.includes(url.hostname)) return; // Firestore/Auth tidak disentuh

    if (sama && req.mode === 'navigate') {
        event.respondWith(halaman(event));
    } else if (!sama || STATIC_EXT.test(url.pathname)) {
        event.respondWith(aset(event));
    }
});
