export interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: 'navigation' | 'selection' | 'editing' | 'general';
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    keys: ['Arrow Keys'],
    description: 'Navigate between reservations in the grid',
    category: 'navigation',
  },
  {
    keys: ['Enter', 'Space'],
    description: 'Select or edit focused reservation',
    category: 'navigation',
  },
  {
    keys: ['Tab'],
    description: 'Move focus to next interactive element',
    category: 'navigation',
  },
  {
    keys: ['Shift', 'Tab'],
    description: 'Move focus to previous interactive element',
    category: 'navigation',
  },
  {
    keys: ['Escape'],
    description: 'Close modal or cancel action',
    category: 'navigation',
  },
  {
    keys: ['Ctrl', 'C'],
    description: 'Copy selected reservation(s)',
    category: 'editing',
  },
  {
    keys: ['Ctrl', 'V'],
    description: 'Paste copied reservation(s)',
    category: 'editing',
  },
  {
    keys: ['Ctrl', 'D'],
    description: 'Duplicate selected reservation(s)',
    category: 'editing',
  },
  {
    keys: ['Delete', 'Backspace'],
    description: 'Delete selected reservation(s)',
    category: 'editing',
  },
  {
    keys: ['Ctrl', 'Z'],
    description: 'Undo last action',
    category: 'editing',
  },
  {
    keys: ['Ctrl', 'Shift', 'Z'],
    description: 'Redo last action',
    category: 'editing',
  },
  {
    keys: ['?'],
    description: 'Show keyboard shortcuts help',
    category: 'general',
  },
];

export function formatShortcutKeys(keys: string[]): string {
  const isMac = typeof window !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return keys
    .map((key) => {
      if (key === 'Ctrl') return isMac ? '⌘' : 'Ctrl';
      if (key === 'Shift') return 'Shift';
      if (key === 'Alt') return isMac ? '⌥' : 'Alt';
      if (key === 'Enter') return 'Enter';
      if (key === 'Space') return 'Space';
      if (key === 'Tab') return 'Tab';
      if (key === 'Escape') return 'Esc';
      if (key === 'Delete') return 'Del';
      if (key === 'Backspace') return 'Backspace';
      if (key === 'Arrow Keys') return '↑ ↓ ← →';
      return key.toUpperCase();
    })
    .join(isMac && keys.includes('Ctrl') ? '' : ' + ');
}

export function getShortcutsByCategory(
  category: KeyboardShortcut['category'],
): KeyboardShortcut[] {
  return KEYBOARD_SHORTCUTS.filter((shortcut) => shortcut.category === category);
}

