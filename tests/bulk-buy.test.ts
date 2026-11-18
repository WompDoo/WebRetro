import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateFeatureLevelsCost, createPlaytestState } from '../src/engine';
import type { GameState } from '../src/engine';
import { renderShopBody } from '../src/ui/render-shop';

const VIEW = { isScrollJackingOn: false, isSpecializationsOpen: true } as const;
const endOf1997 = (): GameState => createPlaytestState('homepage-1997', 'end', 9, 'react');
const bulkButton = (html: string, amount: number): RegExpMatchArray | null => html.match(new RegExp(`<button[^>]*data-id="guestbook" data-amount="${amount}"[^>]*>`));

describe('buying several levels at once', () => {
  it('has no picker: every row buys one level, and offers ×5 and ×10 only once you could pay for them', () => {
    const poor = { ...endOf1997(), money: 0 };
    const html = renderShopBody(poor, 'build', VIEW);
    assert.doesNotMatch(html, /buy-amount/);
    assert.match(bulkButton(html, 5)?.[0] ?? '', / hidden>$/);
    const rich = { ...poor, money: calculateFeatureLevelsCost(poor, 'guestbook', 10) };
    const richHtml = renderShopBody(rich, 'build', VIEW);
    assert.doesNotMatch(bulkButton(richHtml, 10)?.[0] ?? 'missing', / hidden>$/);
    assert.match(bulkButton(richHtml, 10)?.[0] ?? '', /data-bulk title="10 levels for /);
  });
});
