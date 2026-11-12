import type { DefenseId, FeatureId } from '../engine';

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const FEATURE_ICONS: Readonly<Record<FeatureId, string>> = {
  'hit-counter': svg('<rect x="2" y="6" width="20" height="12" rx="1"/><path d="M7 10v4M11 10h2v2h-2v2h2M17 10v4"/>'),
  'under-construction': svg('<path d="M12 3 22 20H2Z"/><path d="M8 14h8M6.5 17h11"/>'),
  guestbook: svg('<path d="M3 5h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H3ZM21 5h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7Z"/>'),
  'midi-player': svg('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  webring: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="2"/><circle cx="19" cy="15" r="2"/><circle cx="5" cy="15" r="2"/>'),
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
};

export const DEFENSE_ICONS: Readonly<Record<DefenseId, string>> = {
  antivirus: svg('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="m9 12 2 2 4-4"/>'),
  'premium-ad-network': svg('<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8L3.5 9.2l5.9-.9Z"/>'),
  captcha: svg('<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M6 14c1.5-4 3-4 4 0s2.5 4 4 0 2.5-4 4 0"/>'),
  // A cloud with a filter under it: attack traffic is scrubbed before it reaches you.
  'ddos-protection': svg('<path d="M7 15a4 4 0 1 1 1-7.9A5 5 0 0 1 17.6 9 3.5 3.5 0 0 1 17 15Z"/><path d="M8 19h8M10 22h4"/>'),
  // A window with a line through it: no pop-ups, ever.
  'no-popups': svg('<rect x="4" y="5" width="16" height="13" rx="1"/><path d="M4 8h16M3 21 21 3"/>'),
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
