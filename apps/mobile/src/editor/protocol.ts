import type { CardDrag } from '../ui/useSwipeMotion';

export type EditorPresentation = 'default' | 'study-front' | 'study-back';

export interface EditorAppearance {
  presentation?: EditorPresentation;
  fontSize?: number;
  dark?: boolean;
  uiScale?: number;
}

/** Commands sent from React Native to the WebView editor. */
export type EditorCommand =
  | ({
      type: 'init';
      html: string;
      editable?: boolean;
      label?: string;
    } & EditorAppearance)
  | { type: 'set'; html: string }
  | { type: 'get'; id: string }
  | { type: 'image'; url: string }
  | ({ type: 'appearance' } & EditorAppearance);

/** Events sent from the WebView editor to React Native. */
export type EditorEvent =
  | { type: 'ready' }
  | { type: 'height'; value: number }
  | { type: 'change'; html: string }
  | { type: 'value'; id: string; html: string }
  | { type: 'image'; url: string }
  | { type: 'flip' }
  | ({ type: 'card-drag' } & CardDrag)
  | { type: 'pick-image' };

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPresentation = (value: unknown): value is EditorPresentation =>
  value === 'default' || value === 'study-front' || value === 'study-back';

const isDragPhase = (value: unknown): value is CardDrag['phase'] =>
  value === 'move' || value === 'end' || value === 'cancel';

function parseAppearance(value: UnknownRecord): EditorAppearance | null {
  if (value.presentation !== undefined && !isPresentation(value.presentation)) return null;
  if (value.fontSize !== undefined && !isFiniteNumber(value.fontSize)) return null;
  if (value.dark !== undefined && typeof value.dark !== 'boolean') return null;
  if (value.uiScale !== undefined && !isFiniteNumber(value.uiScale)) return null;
  return {
    presentation: value.presentation,
    fontSize: value.fontSize,
    dark: value.dark,
    uiScale: value.uiScale,
  };
}

/** Validates an untrusted command received by the WebView editor. */
export function parseEditorCommand(value: unknown): EditorCommand | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  switch (value.type) {
    case 'init': {
      if (typeof value.html !== 'string') return null;
      if (value.editable !== undefined && typeof value.editable !== 'boolean') return null;
      if (value.label !== undefined && typeof value.label !== 'string') return null;
      const appearance = parseAppearance(value);
      if (!appearance) return null;
      return {
        type: 'init',
        html: value.html,
        editable: value.editable,
        label: value.label,
        ...appearance,
      };
    }
    case 'set':
      return typeof value.html === 'string' ? { type: 'set', html: value.html } : null;
    case 'get':
      return typeof value.id === 'string' ? { type: 'get', id: value.id } : null;
    case 'image':
      return typeof value.url === 'string' ? { type: 'image', url: value.url } : null;
    case 'appearance': {
      const appearance = parseAppearance(value);
      return appearance ? { type: 'appearance', ...appearance } : null;
    }
    default:
      return null;
  }
}

/** Validates an untrusted event received by React Native from the WebView. */
export function parseEditorEvent(value: unknown): EditorEvent | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  switch (value.type) {
    case 'ready':
      return { type: 'ready' };
    case 'height':
      return isFiniteNumber(value.value) ? { type: 'height', value: value.value } : null;
    case 'change':
      return typeof value.html === 'string' ? { type: 'change', html: value.html } : null;
    case 'value':
      return typeof value.id === 'string' && typeof value.html === 'string'
        ? { type: 'value', id: value.id, html: value.html }
        : null;
    case 'image':
      return typeof value.url === 'string' ? { type: 'image', url: value.url } : null;
    case 'flip':
      return { type: 'flip' };
    case 'card-drag':
      if (!isDragPhase(value.phase) || !isFiniteNumber(value.dx) || !isFiniteNumber(value.dy)) return null;
      if (value.velocityX !== undefined && !isFiniteNumber(value.velocityX)) return null;
      if (value.velocityY !== undefined && !isFiniteNumber(value.velocityY)) return null;
      return {
        type: 'card-drag',
        phase: value.phase,
        dx: value.dx,
        dy: value.dy,
        velocityX: value.velocityX,
        velocityY: value.velocityY,
      };
    case 'pick-image':
      return { type: 'pick-image' };
    default:
      return null;
  }
}
