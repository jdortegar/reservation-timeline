import { useEffect, useRef, RefObject } from 'react';

interface UseFocusManagementProps {
  isOpen: boolean;
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusRef?: RefObject<HTMLElement>;
  trapFocus?: boolean;
}

export function useFocusManagement({
  isOpen,
  initialFocusRef,
  returnFocusRef,
  trapFocus = true,
}: UseFocusManagementProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store the element that had focus before opening
    previousActiveElementRef.current =
      document.activeElement as HTMLElement | null;

    // Focus initial element if provided
    if (initialFocusRef?.current) {
      setTimeout(() => {
        initialFocusRef.current?.focus();
      }, 0);
    } else if (containerRef.current) {
      // Otherwise focus the container
      setTimeout(() => {
        const firstFocusable = getFirstFocusable(containerRef.current!);
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }, 0);
    }

    if (!trapFocus) return;

    // Focus trap logic
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, initialFocusRef, trapFocus]);

  // Return focus when closing
  useEffect(() => {
    if (isOpen) return;

    const returnTo = returnFocusRef?.current || previousActiveElementRef.current;
    if (returnTo && typeof returnTo.focus === 'function') {
      setTimeout(() => {
        returnTo.focus();
      }, 0);
    }
  }, [isOpen, returnFocusRef]);

  return { containerRef };
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !el.hasAttribute('aria-hidden')
      );
    },
  );
}

function getFirstFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[0] || null;
}

