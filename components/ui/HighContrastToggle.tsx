'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Contrast } from 'lucide-react';

export function HighContrastToggle() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if high contrast is already set
    const saved = localStorage.getItem('highContrast');
    if (saved === 'true') {
      setIsHighContrast(true);
      document.documentElement.setAttribute('data-high-contrast', 'true');
    }

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsHighContrast(true);
        document.documentElement.setAttribute('data-high-contrast', 'true');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    } else {
      mediaQuery.addListener(handleChange);
      return () => {
        mediaQuery.removeListener(handleChange);
      };
    }
  }, []);

  const toggleHighContrast = () => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);

    if (newValue) {
      document.documentElement.setAttribute('data-high-contrast', 'true');
      localStorage.setItem('highContrast', 'true');
    } else {
      document.documentElement.removeAttribute('data-high-contrast');
      localStorage.removeItem('highContrast');
    }
  };

  return (
    <Button
      aria-label={isHighContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'}
      onClick={toggleHighContrast}
      size="sm"
      variant="outline"
    >
      <Contrast className="h-4 w-4" />
      <span className="sr-only">
        {isHighContrast ? 'Disable' : 'Enable'} high contrast
      </span>
    </Button>
  );
}

