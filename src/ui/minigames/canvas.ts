/** A canvas that draws a fixed-size field, sharp at any width and pixel ratio. */
export interface FieldCanvas {
  readonly canvas: HTMLCanvasElement;
  /** Scales the context so drawing uses field units. */
  readonly prepare: () => CanvasRenderingContext2D | null;
  /** Converts a pointer position to field units. */
  readonly toField: (clientX: number, clientY: number) => { readonly x: number; readonly y: number };
}

export function createFieldCanvas(className: string, label: string, fieldWidth: number, fieldHeight: number): FieldCanvas {
  const canvas = document.createElement('canvas');
  canvas.className = `minigame-canvas ${className}`;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', label);
  const prepare = (): CanvasRenderingContext2D | null => {
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, canvas.clientWidth);
    const targetWidth = Math.round(width * pixelRatio);
    if (canvas.width !== targetWidth) {
      canvas.width = targetWidth;
      canvas.height = Math.round(((width * fieldHeight) / fieldWidth) * pixelRatio);
    }
    const context = canvas.getContext('2d');
    if (context !== null) context.setTransform(canvas.width / fieldWidth, 0, 0, canvas.height / fieldHeight, 0, 0);
    return context;
  };
  const toField = (clientX: number, clientY: number): { readonly x: number; readonly y: number } => {
    const box = canvas.getBoundingClientRect();
    return { x: ((clientX - box.left) / Math.max(1, box.width)) * fieldWidth, y: ((clientY - box.top) / Math.max(1, box.height)) * fieldHeight };
  };
  return { canvas, prepare, toField };
}

/** "1 virus", "5 viruses". Irregular words pass their plural. */
export function plural(count: number, word: string, pluralWord = `${word}s`): string {
  return `${count} ${count === 1 ? word : pluralWord}`;
}
