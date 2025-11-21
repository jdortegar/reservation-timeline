import { useCallback, useRef } from 'react';

interface AnnounceOptions {
  priority?: 'polite' | 'assertive';
  delay?: number;
}

export function useScreenReaderAnnounce() {
  const politeRegionRef = useRef<HTMLDivElement | null>(null);
  const assertiveRegionRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback(
    (message: string, options: AnnounceOptions = {}) => {
      const { priority = 'polite', delay = 0 } = options;
      const regionRef = priority === 'assertive' ? assertiveRegionRef : politeRegionRef;

      if (!regionRef.current) {
        // Create region if it doesn't exist
        const region = document.createElement('div');
        region.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
        region.setAttribute('aria-live', priority);
        region.setAttribute('aria-atomic', 'true');
        region.className = 'sr-only';
        region.style.cssText =
          'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
        document.body.appendChild(region);
        regionRef.current = region;
      }

      const region = regionRef.current;

      // Clear previous announcement
      region.textContent = '';

      // Set new announcement after a brief delay to ensure screen readers pick it up
      setTimeout(() => {
        region.textContent = message;
        // Clear after announcement is read (screen readers typically read within 1-2 seconds)
        setTimeout(() => {
          if (region.textContent === message) {
            region.textContent = '';
          }
        }, 2000);
      }, delay);
    },
    [],
  );

  return { announce };
}

