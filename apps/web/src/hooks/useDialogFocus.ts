import { RefObject, useEffect, useRef } from 'react';

const openDialogs: symbol[] = [];
let originalOverflow = '';

/** Shared focus and scroll handling for dialogs and the mobile navigation drawer. */
export function useDialogFocus(
  ref: RefObject<HTMLElement>,
  enabled: boolean,
  onClose?: () => void
) {
  const closeRef = useRef(onClose);
  const restoreTargetRef = useRef<HTMLElement | null>(null);
  const wasEnabledRef = useRef(false);
  closeRef.current = onClose;
  // Capture before React commits an autoFocus field inside the new dialog.
  if (enabled && !wasEnabledRef.current) {
    restoreTargetRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasEnabledRef.current = enabled;
  useEffect(() => {
    if (!enabled) return;
    const dialog = ref.current;
    if (!dialog) return;
    const token = Symbol('dialog');
    const previousFocus = restoreTargetRef.current;
    if (!openDialogs.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openDialogs.push(token);
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
        )
      ).filter(
        (element) =>
          element.getClientRects().length > 0 &&
          !element.closest('[inert]') &&
          element.getAttribute('aria-hidden') !== 'true'
      );
    const frame = requestAnimationFrame(() => {
      if (!dialog.contains(document.activeElement)) {
        (dialog.querySelector<HTMLElement>('[autofocus]') ?? focusable()[0] ?? dialog).focus();
      }
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== token || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.();
      }
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first || !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    // Capture Escape before rich text editors consume it inside the dialog.
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown, true);
      const wasTopmost = openDialogs[openDialogs.length - 1] === token;
      openDialogs.splice(openDialogs.indexOf(token), 1);
      if (!openDialogs.length) document.body.style.overflow = originalOverflow;
      if (wasTopmost && previousFocus?.isConnected) previousFocus.focus();
    };
  }, [enabled, ref]);
}
