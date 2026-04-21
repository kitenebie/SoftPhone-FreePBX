// Global ksipcall API
// Usage: ksipcall.audio("123") or ksipcall.video("123")

const listeners = new Set();

export const ksipcall = {
  audio(target) {
    listeners.forEach((fn) => fn({ target, video: false }));
  },
  video(target) {
    listeners.forEach((fn) => fn({ target, video: true }));
  },
  _subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// Expose globally so it works outside React (plain JS, other frameworks)
if (typeof window !== "undefined") {
  window.ksipcall = ksipcall;
}
