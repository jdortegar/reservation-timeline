'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

interface DropPreviewBlockProps {
  left: number;
  top: number;
  width: number;
  height: number;
  hasConflict?: boolean;
}

export function DropPreviewBlock({
  left,
  top,
  width,
  height,
  hasConflict = false,
}: DropPreviewBlockProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use green for valid drops, red for conflicts
  const borderColor = hasConflict ? '#EF4444' : '#10B981'; // Green: #10B981, Red: #EF4444
  const borderWidth = hasConflict ? '3px' : '2px';

  const dropPreviewContent = (
    <div
      className="fixed rounded border-2 border-dashed pointer-events-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: hasConflict ? '#EF444420' : '#10B98120', // Red tint for conflicts, green tint for valid
        borderColor,
        borderWidth,
        borderStyle: 'dashed',
        opacity: hasConflict ? 0.8 : 0.6,
        zIndex: 9998,
        position: 'fixed',
        boxShadow: hasConflict
          ? '0 0 8px rgba(239, 68, 68, 0.5)'
          : '0 0 8px rgba(16, 185, 129, 0.3)', // Green glow for valid drops
      }}
    />
  );

  // Render drop preview in a portal to escape stacking context and scroll issues
  if (typeof window === 'undefined' || !mounted) {
    return null;
  }

  return createPortal(dropPreviewContent, document.body);
}
