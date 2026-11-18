import type { DefenseId, FeatureId } from '../engine';

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const FEATURE_ICONS: Readonly<Record<FeatureId, string>> = {
  'hit-counter': svg('<rect x="2" y="6" width="20" height="12" rx="1"/><path d="M7 10v4M11 10h2v2h-2v2h2M17 10v4"/>'),
  'under-construction': svg('<path d="M12 3 22 20H2Z"/><path d="M8 14h8M6.5 17h11"/>'),
  guestbook: svg('<path d="M3 5h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H3ZM21 5h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7Z"/>'),
  'midi-player': svg('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  webring: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="2"/><circle cx="19" cy="15" r="2"/><circle cx="5" cy="15" r="2"/>'),
  // A card with a heart on it.
  'e-cards': svg('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M12 16s-4-2.5-4-5a2 2 0 0 1 4-1 2 2 0 0 1 4 1c0 2.5-4 5-4 5Z"/>'),
  // An @.
  'free-email': svg('<circle cx="12" cy="12" r="3.5"/><path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.4 6.8"/>'),
  blog: svg('<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13 7 4 4"/>'),
  comments: svg('<path d="M4 4h16v11H9l-5 5Z"/><path d="M8 9h8M8 12h5"/>'),
  'tag-cloud': svg('<path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 18Z"/>'),
  forum: svg('<path d="M3 5h12v8H7l-4 3Z"/><path d="M9 13v2h8l4 3V9h-6"/>'),
  'flash-intro': svg('<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>'),
  'photo-gallery': svg('<rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="1.5"/><path d="m21 16-5-5-8 8"/>'),
  'map-mashup': svg('<path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11Z"/><circle cx="12" cy="10" r="2"/>'),
  'share-buttons': svg('<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>'),
  'video-player': svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>'),
  'activity-feed': svg('<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="1.5"/>'),
  // A tall page with an arrow pulling you down it.
  'one-pager': svg('<rect x="6" y="2" width="12" height="20" rx="1"/><path d="M12 7v8M9 12l3 3 3-3"/>'),
  // A person and an arrow going in: join with an account you already have.
  'social-login': svg('<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 9h6M18 6l3 3-3 3"/>'),
  // A face in a ring, and the next one peeking in.
  stories: svg('<circle cx="9" cy="12" r="6"/><circle cx="9" cy="12" r="3.5"/><path d="M17 7.5a6 6 0 0 1 0 9"/>'),
  // Three plans, the middle one taller.
  'pricing-table': svg('<rect x="2" y="7" width="6" height="12" rx="1"/><rect x="9" y="4" width="6" height="16" rx="1"/><rect x="16" y="7" width="6" height="12" rx="1"/>'),
  // The bubble in the corner, with its unread dot.
  'live-chat': svg('<path d="M4 5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-5 4Z"/><circle cx="19.5" cy="5.5" r="2.5"/>'),
  // A globe: lines of latitude and one of longitude.
  'language-switcher': svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  // An envelope.
  newsletter: svg('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/>'),
  // 2024: a speech bubble with a sparkle in it.
  'ai-chatbot': svg('<path d="M4 5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-5 4Z"/><path d="m11.5 7.5.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8Z"/>'),
  // A page of text, many of them.
  'ai-articles': svg('<path d="M6 3h9l4 4v14H6Z"/><path d="M9 11h7M9 15h7M9 7h3"/>'),
  // A magnifying glass with a plus: it answers, not just finds.
  'ai-search': svg('<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M10 7v6M7 10h6"/>'),
  // A picture: a sun and a hill.
  'ai-images': svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>'),
  // A feed of lines, and a dot where it picks for you.
  'for-you-feed': svg('<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2"/>'),
  webcam: svg('<circle cx="12" cy="10" r="6"/><circle cx="12" cy="10" r="2"/><path d="M8 20h8M12 16v4"/>'),
  // An arrow pointer with a sparkle beside it.
  'custom-cursor': svg('<path d="M5 3v15l4-4 3 7 3-1.4-3-6.6h6Z"/><path d="M19 3v4M17 5h4"/>'),
  wiki: svg('<path d="M4 5h16v14H4Z"/><path d="m7 9 1.5 6L10 11l1.5 4L13 9M15 9h2M15 12h2"/>'),
  'deal-of-the-day': svg('<path d="M3 12 12 3h8v8l-9 9Z"/><circle cx="16" cy="7" r="1.5"/>'),
  'community-chat': svg('<path d="M3 5h12v8H8l-4 3v-3H3Z"/><path d="M9 13v2h7l4 3v-3h1V7h-4"/>'),
  'agent-store': svg('<path d="M4 8h16l-1 12H5Z"/><path d="M9 8a3 3 0 0 1 6 0"/><path d="m12 12 .6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z"/>'),
  // ---------- Specializations' own features ----------
  // Two pens: many writers.
  'member-blogs': svg('<path d="M3 20h3l9-9-3-3-9 9Z"/><path d="M12 20h3l6-6-3-3-3 3"/>'),
  // Three photos fanned out.
  'photo-groups': svg('<rect x="3" y="8" width="12" height="12" rx="1"/><path d="M7 8V5h12v12h-4"/><path d="m3 17 4-4 4 4"/>'),
  // A play button on a stack of channels.
  channels: svg('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M7 3h10"/><path d="m10 10 5 2.5-5 2.5Z"/>'),
  // Boards inside a board.
  subforums: svg('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M8 13h10M8 16h7"/><circle cx="5.5" cy="14.5" r=".8"/>'),
  // Two speech marks: the argument behind the article.
  'talk-pages': svg('<path d="M4 4h16v12H10l-4 4v-4H4Z"/><path d="M9 8v3M13 8v3"/>'),
  // Three people.
  groups: svg('<circle cx="12" cy="8" r="3"/><circle cx="5" cy="10" r="2"/><circle cx="19" cy="10" r="2"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6M1.5 18c0-2 1.5-3.5 3.5-3.5M22.5 18c0-2-1.5-3.5-3.5-3.5"/>'),
  // A hash.
  'trending-topics': svg('<path d="M9 3 7 21M17 3l-2 18M4 9h17M3 15h17"/>'),
  // A grinning face.
  'emotes-and-raids': svg('<circle cx="12" cy="12" r="9"/><path d="M8 14c1 2 2.4 3 4 3s3-1 4-3"/><path d="M9 9h.01M15 9h.01"/>'),
  // A numbered list.
  listicles: svg('<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 6h1v-2M4 12h2l-2 2h2M4 17h2v2H4"/>'),
  // A pin with a tick.
  'check-ins': svg('<path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11Z"/><path d="m9.5 10 2 2 3-3.5"/>'),
  // A price tag on a box.
  'product-listings': svg('<path d="M3 7l9-4 9 4v10l-9 4-9-4Z"/><path d="m3 7 9 4 9-4M12 11v10"/>'),
  // A face with dog ears.
  'filters-and-lenses': svg('<circle cx="12" cy="14" r="6"/><path d="M7 10 5 4l5 3.5M17 10l2-6-5 3.5"/><path d="M10 14h.01M14 14h.01"/>'),
  // A clapperboard.
  originals: svg('<rect x="3" y="9" width="18" height="11" rx="1"/><path d="m3 9 2-5 16 2-1 3"/><path d="m8 4.5 2 4M13 5l2 4"/>'),
  // An envelope with a dollar sign.
  'paid-newsletters': svg('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/><path d="M12 13v5"/>'),
  // Bars going up.
  'seller-dashboards': svg('<path d="M4 20V10M10 20V6M16 20v-8M3 20h18"/><path d="M20 4l-4 4"/>'),
  // A briefcase.
  'job-board': svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>'),
  // A server icon with a dot: a community's place.
  servers: svg('<circle cx="12" cy="12" r="9"/><path d="M8 10h8M8 14h5"/>'),
  // Two screens side by side.
  'duets-and-remixes': svg('<rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/><path d="m6 10 3 2-3 2ZM16 10l3 2-3 2Z"/>'),
  // Numbered references.
  'sources-panel': svg('<path d="M5 4h10l4 4v12H5Z"/><path d="M8 12h1M8 16h1M12 12h4M12 16h4"/>'),
  // A picture frame with a sparkle.
  'prompt-gallery': svg('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="m3 17 5-5 4 4 3-3 6 6"/><path d="m16 7 .5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5Z"/>'),
  // A face in a speech bubble.
  characters: svg('<path d="M4 4h16v12H10l-4 4v-4H4Z"/><circle cx="12" cy="9" r="2.5"/><path d="M8.5 14c.8-1.3 2-2 3.5-2s2.7.7 3.5 2"/>'),
  // A robot's head.
  'agent-listings': svg('<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16h5"/><circle cx="12" cy="3.5" r="1"/>'),
};

export const DEFENSE_ICONS: Readonly<Record<DefenseId, string>> = {
  antivirus: svg('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="m9 12 2 2 4-4"/>'),
  'premium-ad-network': svg('<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8L3.5 9.2l5.9-.9Z"/>'),
  captcha: svg('<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M6 14c1.5-4 3-4 4 0s2.5 4 4 0 2.5-4 4 0"/>'),
  // A cloud with a filter under it: attack traffic is scrubbed before it reaches you.
  'ddos-protection': svg('<path d="M7 15a4 4 0 1 1 1-7.9A5 5 0 0 1 17.6 9 3.5 3.5 0 0 1 17 15Z"/><path d="M8 19h8M10 22h4"/>'),
  // A window with a line through it: no pop-ups, ever.
  'no-popups': svg('<rect x="4" y="5" width="16" height="13" rx="1"/><path d="M4 8h16M3 21 21 3"/>'),
  // A shield with a little robot face: bots stop here.
  'bot-shield': svg('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><rect x="9" y="10" width="6" height="5" rx="1"/><path d="M12 8v2"/>'),
  // A railing.
  guardrails: svg('<path d="M3 8h18M3 16h18M6 5v14M12 5v14M18 5v14"/>'),
};

export const AD_ICON = svg('<rect x="2" y="7" width="20" height="10" rx="1"/><path d="M6 14l1.5-4L9 14M6.5 12.8h2M12 10v4h1.5a2 2 0 0 0 0-4Z"/>');
export const COOKIE_ICON = svg('<path d="M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3Z"/><path d="M8.5 10.5h.01M9 15.5h.01M13.5 16h.01M12.5 12h.01"/>');
export const UPGRADE_ICON = svg('<path d="M12 19V5M6 11l6-6 6 6"/><path d="M5 21h14"/>');
export const CODE_ICON = svg('<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>');
export const SERVER_ICON = svg('<rect x="4" y="3" width="16" height="7" rx="1"/><rect x="4" y="14" width="16" height="7" rx="1"/><path d="M8 6.5h.01M8 17.5h.01"/>');
/** A terminal prompt: the things you run, not the things you build. */
export const OPS_ICON = svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M12 15h5"/>');
export const LOCK_ICON = svg('<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>');
export const LEARN_ICON = svg('<path d="M3 7 12 3l9 4-9 4Z"/><path d="M7 9v5c0 1.5 2.2 3 5 3s5-1.5 5-3V9"/><path d="M21 7v6"/>');
