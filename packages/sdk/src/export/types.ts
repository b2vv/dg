export type ExportFormat = 'png' | 'svg' | 'pdf';
export type ExportScope = 'viewport' | 'full' | 'subtree';

export interface ExportOptions {
  format: ExportFormat;
  scope?: ExportScope;
  subtreeRootId?: string;
  /** PNG / PDF raster multiplier (default 2) */
  scale?: number;
  background?: string;
  includeLabels?: boolean;
  /** Target width hint for PNG full export */
  width?: number;
  /**
   * Where export warnings go. Absent → `console.warn`, because an export that
   * silently differs from the canvas is the kind of quiet lie this repo bans.
   */
  onDiagnostic?: (message: string) => void;
}

export class ExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportError';
  }
}

export function assertExportOptions(options: ExportOptions): void {
  const format = options.format;
  if (format !== 'png' && format !== 'svg' && format !== 'pdf') {
    throw new ExportError(`Invalid export format: ${String(format)}`);
  }
  const scope = options.scope ?? 'viewport';
  if (scope === 'subtree' && !options.subtreeRootId) {
    throw new ExportError('scope: "subtree" requires subtreeRootId');
  }
}
