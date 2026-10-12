/**
 * PWA Service Worker & Offline Manager
 */

export interface CacheProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface CacheStatus {
  isSupported: boolean;
  isRegistered: boolean;
  pdfCount: number;
  thumbCount: number;
  totalStickers: number;
  isFullyCached: boolean;
}

// Global reference for beforeinstallprompt event
let deferredInstallPrompt: any = null;
const installListeners = new Set<(canInstall: boolean) => void>();

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installListeners.forEach((listener) => listener(true));
  });

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(false));
    console.log('Ronde Sticker Generator PWA is succesvol geïnstalleerd!');
  });

  // Register service worker after window loads
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('PWA ServiceWorker geregistreerd met scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('PWA ServiceWorker registratie mislukt:', error);
      });
  });
}

/**
 * Check if the app can currently be installed via native prompt
 */
export function canInstallPWA(): boolean {
  return deferredInstallPrompt !== null;
}

/**
 * Subscribe to installability changes
 */
export function onInstallableChange(callback: (canInstall: boolean) => void): () => void {
  installListeners.add(callback);
  callback(canInstallPWA());
  return () => {
    installListeners.delete(callback);
  };
}

/**
 * Prompt the user to install the PWA
 */
export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) {
    return false;
  }

  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(false));
    return outcome === 'accepted';
  } catch (err) {
    console.error('Error during PWA install prompt:', err);
    return false;
  }
}

/**
 * Check if the app is currently running in standalone (installed) mode
 */
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check CacheStorage status for offline stickers
 */
export async function getOfflineStatus(): Promise<CacheStatus> {
  const isSupported = typeof window !== 'undefined' && 'caches' in window;
  if (!isSupported) {
    return {
      isSupported: false,
      isRegistered: false,
      pdfCount: 0,
      thumbCount: 0,
      totalStickers: 0,
      isFullyCached: false,
    };
  }

  try {
    const cache = await caches.open('sticker-a4-v1');
    const requests = await cache.keys();
    let pdfCount = 0;
    let thumbCount = 0;

    for (const req of requests) {
      const url = req.url;
      if (url.includes('/PDFs/')) pdfCount++;
      if (url.includes('/thumbnails/')) thumbCount++;
    }

    // Get total from stickers.json if available
    let totalStickers = 0;
    try {
      const res = await fetch('/stickers.json');
      if (res.ok) {
        const stickers = await res.json();
        totalStickers = stickers.length;
      }
    } catch {
      // offline fallback
      totalStickers = Math.max(pdfCount, thumbCount);
    }

    return {
      isSupported: true,
      isRegistered: true,
      pdfCount,
      thumbCount,
      totalStickers,
      isFullyCached: totalStickers > 0 && pdfCount >= totalStickers,
    };
  } catch (err) {
    console.warn('Could not read offline cache status:', err);
    return {
      isSupported: true,
      isRegistered: false,
      pdfCount: 0,
      thumbCount: 0,
      totalStickers: 0,
      isFullyCached: false,
    };
  }
}

/**
 * Pre-cache all stickers and thumbnails into CacheStorage for 100% offline use
 */
export async function cacheAllStickersForOffline(
  onProgress?: (progress: CacheProgress) => void
): Promise<{ success: boolean; cachedCount: number }> {
  if (!('caches' in window)) {
    throw new Error('CacheStorage wordt niet ondersteund in deze browser.');
  }

  const res = await fetch('/stickers.json');
  if (!res.ok) {
    throw new Error('Kon stickers.json niet inladen.');
  }

  const stickers = await res.json();
  const cache = await caches.open('sticker-a4-v1');

  // Pre-cache standard fonts as well
  const standardFonts = [
    '/standard_fonts/LiberationSans-Regular.ttf',
    '/standard_fonts/LiberationSans-Bold.ttf',
    '/standard_fonts/LiberationSans-Italic.ttf',
    '/standard_fonts/LiberationSans-BoldItalic.ttf',
  ];

  for (const fontUrl of standardFonts) {
    try {
      const match = await cache.match(fontUrl);
      if (!match) {
        const fontRes = await fetch(fontUrl);
        if (fontRes.ok) await cache.put(fontUrl, fontRes);
      }
    } catch {
      // ignore individual font fails
    }
  }

  // Collect all URLs to cache (PDFs + thumbnails)
  const urlsToCache: string[] = [];
  for (const sticker of stickers) {
    if (sticker.fileName) {
      const encodedPdf = encodeURI(sticker.fileName).replace(/#/g, '%23');
      urlsToCache.push(`/PDFs/${encodedPdf}`);
      const thumbName = sticker.fileName.replace(/\.pdf$/i, '.png');
      const encodedThumb = encodeURI(thumbName).replace(/#/g, '%23');
      urlsToCache.push(`/thumbnails/${encodedThumb}`);
    }
  }

  const total = urlsToCache.length;
  let completed = 0;

  // Cache in small parallel batches to avoid overloading the browser
  const batchSize = 6;
  for (let i = 0; i < urlsToCache.length; i += batchSize) {
    const batch = urlsToCache.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (url) => {
        try {
          const match = await cache.match(url);
          if (!match) {
            const fetchRes = await fetch(url);
            if (fetchRes.ok) {
              await cache.put(url, fetchRes);
            }
          }
        } catch {
          // Continue on individual asset fetch error
        } finally {
          completed++;
        }
      })
    );

    if (onProgress) {
      onProgress({
        completed,
        total,
        percentage: Math.round((completed / total) * 100),
      });
    }
  }

  return { success: true, cachedCount: completed };
}
