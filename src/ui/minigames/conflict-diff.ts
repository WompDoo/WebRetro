import { escapeHtml } from '../dom';

/**
 * Where two versions of a line differ: everything they share at the start and at the end stays plain, and the middle
 * of each is marked. "Hompage" against "Homepage" lights up the missing "e", so a typo is plain to see without knowing
 * any code. Both results are escaped HTML.
 */
export interface MarkedPair {
  readonly first: string;
  readonly second: string;
}

function countSharedStart(first: string, second: string): number {
  const limit = Math.min(first.length, second.length);
  let index = 0;
  while (index < limit && first[index] === second[index]) index += 1;
  return index;
}

/** Shared characters at the end, never reaching back into the shared start. */
function countSharedEnd(first: string, second: string, sharedStart: number): number {
  const limit = Math.min(first.length, second.length) - sharedStart;
  let count = 0;
  while (count < limit && first[first.length - 1 - count] === second[second.length - 1 - count]) count += 1;
  return count;
}

function markMiddle(line: string, start: number, end: number): string {
  const middle = line.slice(start, line.length - end);
  const marked = middle === '' ? '' : `<mark>${escapeHtml(middle)}</mark>`;
  return `${escapeHtml(line.slice(0, start))}${marked}${escapeHtml(line.slice(line.length - end))}`;
}

export function markDifference(first: string, second: string): MarkedPair {
  const start = countSharedStart(first, second);
  const end = countSharedEnd(first, second, start);
  return { first: markMiddle(first, start, end), second: markMiddle(second, start, end) };
}
