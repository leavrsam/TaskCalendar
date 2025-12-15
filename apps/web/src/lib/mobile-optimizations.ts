/*
 * Mobile Performance Script
 * Adds mobile-specific optimizations and prevents zoom
 */

// Prevent double-tap zoom on iOS
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Prevent pinch zoom
document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

export { };
