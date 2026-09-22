/* ══════════════════════════════════════════════
   sw.js — Service Worker สมุดบัญชีร้านค้า v10
   • เปิดใช้ออฟไลน์ได้เต็มที่ (ไม่มีเน็ตก็เปิดแอปได้)
   • อัปเดตไฟล์ใหม่อัตโนมัติเมื่อมีการแก้ index.html
   • ล้างแคชเก่าทิ้งให้เอง ไม่ค้างเวอร์ชันเดิม
   ══════════════════════════════════════════════ */

const CACHE = 'shopbook-v10';

/* ไฟล์ที่ต้องเก็บไว้ใช้ตอนไม่มีเน็ต */
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

/* ── 1) ติดตั้ง: โหลดไฟล์เก็บลงแคช ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      /* cache:'reload' = ข้ามแคช HTTP ของเบราว์เซอร์ ได้ไฟล์ล่าสุดจริง */
      .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

/* ── 2) เปิดใช้งาน: ลบแคชเวอร์ชันเก่าทิ้ง ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── 3) ดักการโหลดไฟล์ ──
   หน้าเว็บ (HTML) : ลองเน็ตก่อน ➜ ไม่มีเน็ตค่อยใช้ของในแคช
   ไฟล์อื่น        : ใช้แคชก่อน ➜ ไม่มีค่อยโหลดจากเน็ต    */
self.addEventListener('fetch', e => {
  const req = e.request;

  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;

  const isPage = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    e.respondWith(
      /* no-cache = ถามเซิร์ฟเวอร์ทุกครั้งว่าไฟล์เปลี่ยนไหม (ไม่ใช้ของค้าง 10 นาทีของ GitHub Pages) */
      fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }))
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then(r => r || caches.match('./index.html'))
        )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
    })
  );
});

/* ── 4) สั่งอัปเดตทันทีจากหน้าเว็บได้ ── */
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});