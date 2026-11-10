import { createSpamSortGame, sortSpamCard, SPAM_SORT_MAX_MISTAKES } from '../../engine';
import type { SpamCard, SpamDecision, SpamSortGame } from '../../engine';
import { escapeHtml, pickCyclic, setHtmlIfChanged } from '../dom';
import type { MinigameView } from './types';

interface CommentCopy {
  readonly author: string;
  readonly text: string;
}

const SPAM_COMMENTS: readonly CommentCopy[] = [
  { author: 'cheap_pills_4u', text: 'Great post!!! Visit my site for CHEAP pills' },
  { author: 'xXwinnerXx', text: 'cl1ck h3re 4 a fr33 mp3 player!!!' },
  { author: 'ringtone_king', text: 'BUY CHEAP RINGTONES. Best prices on the web' },
  { author: 'HomeIncome', text: 'I made $5000 last week working from home. Ask me how' },
  { author: 'seo_expert_99', text: 'Nice blog. Check out my blog about loans loans loans' },
  { author: 'casino_bonus', text: 'Online casino bonus!!! Click my name!!!' },
];

const REAL_COMMENTS: readonly CommentCopy[] = [
  { author: 'jen_k', text: 'Great post! Bookmarked it.' },
  { author: 'dave', text: 'First!' },
  { author: 'css_wizard', text: 'Have you tried the clearfix hack? Life changing.' },
  { author: 'mo', text: 'Does this work in the old browser though?' },
  { author: 'grandma_rose', text: 'I don’t know what a blog is but I like the pictures.' },
  { author: 'pixel_pete', text: 'Love the new design. Very shiny.' },
];

const AVATAR_COLORS: readonly string[] = ['#5C9E2E', '#2A6FB0', '#E07A00', '#9B4DCA', '#C9342E'];
const FALLBACK_COMMENT: CommentCopy = { author: 'someone', text: 'hi' };
const SWIPE_THRESHOLD_PX = 40;
const KEY_DECISIONS: Readonly<Record<string, SpamDecision>> = { ArrowLeft: 'trash', ArrowRight: 'keep', s: 'trash', k: 'keep', S: 'trash', K: 'keep' };

const MISTAKE_TEXT: Readonly<Record<SpamDecision, string>> = {
  trash: 'Oops, that was a real reader.',
  keep: 'Spam got published!',
};

function commentFor(card: SpamCard): CommentCopy {
  const pool = card.isSpam ? SPAM_COMMENTS : REAL_COMMENTS;
  return pickCyclic(pool, Math.floor(card.textRoll * pool.length), FALLBACK_COMMENT);
}

function renderCard(game: SpamSortGame): string {
  const card = game.cards[0];
  if (card === undefined) return '<p class="spam-count">All sorted.</p>';
  const comment = commentFor(card);
  const color = pickCyclic(AVATAR_COLORS, comment.author.length, '#5C9E2E');
  return `<div class="spam-card"><span class="avatar" style="background:${color}">${escapeHtml(comment.author.charAt(0).toUpperCase())}</span><span class="spam-author">${escapeHtml(comment.author)}</span><span class="spam-text">${escapeHtml(comment.text)}</span></div>`;
}

function describeStatus(game: SpamSortGame): string {
  if (game.status === 'won') return 'Comments cleaned up!';
  if (game.status === 'lost') return 'Too many wrong calls. The spam is still there.';
  return game.lastMistake === null ? 'Spam to the trash, real comments onto the page.' : MISTAKE_TEXT[game.lastMistake];
}

/** Sort the flood one comment at a time. Swipe like a dating app, years before those existed. */
export const spamSortView: MinigameView = (stage, target, seed) => {
  let game = createSpamSortGame(target.difficulty, seed);
  let swipeStartX: number | null = null;
  const cardSlot = document.createElement('div');
  const buttons = document.createElement('div');
  buttons.className = 'spam-buttons';
  buttons.innerHTML = '<button type="button" class="spam-trash" data-spam-decision="trash">🗑 Spam</button><button type="button" class="spam-keep" data-spam-decision="keep">✓ Approve</button>';
  stage.append(cardSlot, buttons);

  const render = (): void => setHtmlIfChanged(cardSlot, renderCard(game));
  const decide = (decision: SpamDecision): void => {
    game = sortSpamCard(game, decision);
    render();
  };
  buttons.addEventListener('click', (event) => {
    const decision = (event.target instanceof Element ? event.target.closest<HTMLElement>('[data-spam-decision]') : null)?.dataset['spamDecision'];
    if (decision === 'trash' || decision === 'keep') decide(decision);
  });
  cardSlot.addEventListener('pointerdown', (event) => {
    swipeStartX = event.clientX;
  });
  cardSlot.addEventListener('pointerup', (event) => {
    if (swipeStartX === null) return;
    const deltaX = event.clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD_PX) decide(deltaX < 0 ? 'trash' : 'keep');
  });
  render();

  return {
    brief: `Spam bots flooded your ${target.featureName}. Sort ${game.total} comments; ${SPAM_SORT_MAX_MISTAKES} wrong calls and the spam wins.`,
    hint: '← spam · → approve · or swipe',
    tick: () => undefined,
    handleKey: (event) => {
      const decision = KEY_DECISIONS[event.key];
      if (decision === undefined) return false;
      event.preventDefault();
      decide(decision);
      return true;
    },
    progress: () => `${game.total - game.cards.length} / ${game.total} sorted`,
    status: () => game.status,
    statusText: () => describeStatus(game),
    destroy: () => stage.replaceChildren(),
  };
};
