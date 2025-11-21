'use client';

import { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  delay?: number;
}

export function LiveRegion({ message, priority = 'polite', delay = 0 }: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!message || !regionRef.current) return;

    const region = regionRef.current;

    // Clear previous message
    region.textContent = '';

    // Set new message after delay
    const timeoutId = setTimeout(() => {
      if (region) {
        region.textContent = message;
      }
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [message, delay]);

  return (
    <div
      ref={regionRef}
      role={priority === 'assertive' ? 'alert' : 'status'}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    />
  );
}

