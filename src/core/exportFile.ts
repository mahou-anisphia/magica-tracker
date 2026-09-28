import type { Root } from './schema';
import { localDateStamp, localTimeStamp } from './time';

/** The whole root, pretty-printed, with `exportedAt` next to `schemaVersion`. */
export function exportJson(root: Root, exportedAt: string): string {
  const { schemaVersion, ...rest } = root;
  return `${JSON.stringify({ schemaVersion, exportedAt, ...rest }, null, 2)}\n`;
}

export function exportFileName(d: Date): string {
  return `magica-tracker-${localDateStamp(d)}.json`;
}

export function beforeImportFileName(d: Date): string {
  return `magica-tracker-before-import-${localTimeStamp(d)}.json`;
}
