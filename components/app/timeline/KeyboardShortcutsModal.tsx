'use client';

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  KEYBOARD_SHORTCUTS,
  formatShortcutKeys,
  getShortcutsByCategory,
} from '@/lib/helpers/keyboardShortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const categories: Array<{ name: string; key: 'navigation' | 'selection' | 'editing' | 'general' }> = [
    { name: 'Navigation', key: 'navigation' },
    { name: 'Selection', key: 'selection' },
    { name: 'Editing', key: 'editing' },
    { name: 'General', key: 'general' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and interact with the reservation timeline.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          {categories.map((category) => {
            const shortcuts = getShortcutsByCategory(category.key);
            if (shortcuts.length === 0) return null;

            return (
              <div key={category.key}>
                <h3 className="font-semibold text-sm mb-3 text-foreground">
                  {category.name}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0"
                    >
                      <div className="flex-1 text-sm text-muted-foreground">
                        {shortcut.description}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded shadow-sm">
                          {formatShortcutKeys(shortcut.keys)}
                        </kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

