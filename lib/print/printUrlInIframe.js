/**
 * Print a same-origin URL without navigating or opening a new tab.
 * Renders the URL in a hidden iframe, then calls the iframe's print().
 *
 * Note: Most browsers require this to be triggered from a user gesture (e.g. click).
 */
export function printUrlInIframe(url, opts = {}) {
  const {
    title = 'print-frame',
    cleanupDelayMs = 1000,
    loadTimeoutMs = 15000,
  } = opts;

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('printUrlInIframe must be called in a browser'));
  }

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', title);
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    // Some browsers won't reliably layout/print if the frame is truly 0x0.
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    let cleaned = false;
    let loadTimer = null;
    let cleanupTimer = null;
    let afterPrintHandler = null;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (loadTimer) window.clearTimeout(loadTimer);
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
      try {
        iframe.onload = null;
        if (afterPrintHandler && iframe.contentWindow) {
          iframe.contentWindow.removeEventListener('afterprint', afterPrintHandler);
        }
      } catch {
        // ignore
      }
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    loadTimer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Print frame timed out loading: ${url}`));
    }, loadTimeoutMs);

    iframe.onload = () => {
      const w = iframe.contentWindow;
      if (!w) {
        cleanup();
        reject(new Error('Missing iframe contentWindow'));
        return;
      }

      // Try to clean up once the print dialog closes.
      afterPrintHandler = () => {
        cleanup();
        resolve();
      };
      try {
        w.addEventListener('afterprint', afterPrintHandler);
      } catch {
        // ignore
      }

      // Fallback cleanup in case afterprint doesn't fire (common).
      cleanupTimer = window.setTimeout(() => {
        cleanup();
        resolve();
      }, cleanupDelayMs);

      const doPrint = () => {
        try {
          // Some browsers are more reliable if focus happens before print.
          w.focus();
          // Ensure layout has occurred before printing.
          void w.document?.body?.offsetHeight;
          w.print();
        } catch (e) {
          cleanup();
          reject(e);
        }
      };

      // Wait for web fonts (if any) and a tiny delay so styles/layout settle.
      const fontsReady = w.document?.fonts?.ready;
      Promise.resolve(fontsReady)
        .catch(() => {})
        .finally(() => window.setTimeout(doPrint, 50));
    };

    iframe.src = url;
    document.body.appendChild(iframe);
  });
}

