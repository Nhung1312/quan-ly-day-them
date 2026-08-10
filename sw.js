self.addEventListener('install', (e) => {
    console.log('[Service Worker] Đã cài đặt');
});

self.addEventListener('fetch', (e) => {
    // Chỉ cần khai báo hàm fetch để trình duyệt đồng ý cho cài App
});