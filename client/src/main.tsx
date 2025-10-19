import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// SERVICE WORKER DISABLED - UNREGISTERING OLD CACHE
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('🗑️ OLD Service Worker unregistered');
    });
  });
  // Clear all caches
  caches.keys().then((cacheNames) => {
    cacheNames.forEach((cacheName) => {
      caches.delete(cacheName);
      console.log('🗑️ Cache deleted:', cacheName);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
