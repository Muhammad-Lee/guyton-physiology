// ============================================================
//  Service Worker نهایی - گایتون ۲۰۱۶
//  کاملاً هماهنگ با manifest.json نسخه ۲۰۲۴
//  نسخه ۶.۰ - بینقص و حرفه‌ای
// ============================================================

const CACHE_NAME = 'guyton-v6';
const BASE_PATH = '/guyton-physiology/';

// لیست کامل فایل‌های مورد نیاز (هماهنگ با manifest.json)
const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'sw.js',
  BASE_PATH + 'icon-192.png',
  BASE_PATH + 'icon-512.png'
];

// ============================================================
//  ۱. نصب Service Worker
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] فایل‌ها در حال کش شدن...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] کش کامل شد!');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] خطا در کش کردن:', err);
      })
  );
});

// ============================================================
//  ۲. فعال‌سازی Service Worker
// ============================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] کش قدیمی حذف شد:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Service Worker فعال شد!');
      return self.clients.claim();
    })
  );
});

// ============================================================
//  ۳. مدیریت درخواست‌ها با استراتژی هوشمند
// ============================================================
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // فقط درخواست‌های GET را پردازش کن
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // برای درخواست‌های manifest.json و sw.js، همیشه از شبکه استفاده کن
  if (url.pathname.includes('manifest.json') || url.pathname.includes('sw.js')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
    );
    return;
  }

  // استراتژی: Cache First, Network Fallback
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) {
          // اگر در کش موجود بود، برگردان
          return cached;
        }

        // اگر در کش نبود، از شبکه دریافت کن
        return fetch(request)
          .then(response => {
            // پاسخ معتبر را کش کن
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, clone);
              });
            }
            return response;
          })
          .catch(() => {
            // اگر نت‌نت در دسترس نبود، صفحه اصلی را برگردان
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match(BASE_PATH + 'index.html');
            }
            return new Response('', { status: 404 });
          });
      })
  );
});

// ============================================================
//  ۴. دریافت پیام‌ها (برای به‌روزرسانی خودکار)
// ============================================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================================
//  ۵. نمایش اعلان‌های Push (اختیاری)
// ============================================================
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'مطالب جدیدی برای مطالعه وجود دارد!',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'گایتون ۲۰۱۶', options)
  );
});

// ============================================================
//  ۶. کلیک روی اعلان (باز کردن لینک)
// ============================================================
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});