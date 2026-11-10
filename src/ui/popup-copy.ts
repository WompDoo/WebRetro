export type PopupDesign = 'dialog' | 'alert' | 'prize' | 'download' | 'lightbox' | 'survey' | 'messenger' | 'toolbar';

export interface PopupCopy {
  readonly design: PopupDesign;
  readonly title: string;
  readonly headline: string;
  readonly body: string;
  /** Survey answers, checkbox labels, chat lines or download stats, depending on the design. */
  readonly details: readonly string[];
  /** The safe way out. */
  readonly dismissLabel: string;
  /** The tempting button. Clicking it costs money. Empty means this pop-up has none. */
  readonly acceptLabel: string;
  /** What happened when you fell for it. Shown in the news. */
  readonly scamOutcome: string;
}

export const HOMEPAGE_POPUPS: readonly PopupCopy[] = [
  { design: 'dialog', title: 'Congratulations!!!', headline: 'YOU ARE THE 1,000,000th VISITOR!', body: 'Click OK to claim your FREE prize. This is not a joke!!!', details: [], dismissLabel: 'No thanks', acceptLabel: 'OK!!!', scamOutcome: 'You clicked OK to claim your prize. The prize was a “processing fee”.' },
  { design: 'dialog', title: 'Message from the Webmaster', headline: 'Welcome to my homepage!!!', body: 'Please sign my guestbook before you leave. Please.', details: [], dismissLabel: 'OK', acceptLabel: '', scamOutcome: '' },
  { design: 'dialog', title: 'Chain letter', headline: 'Forward this to 10 friends!', body: 'A big software company will pay you $5 for every email you forward. My cousin got $800.', details: [], dismissLabel: 'Delete', acceptLabel: 'Forward it', scamOutcome: 'You forwarded it to 10 friends. Nobody paid you, and you bought a “premium forwarding license”.' },
  { design: 'alert', title: 'System warning', headline: 'Your PC may be running SLOW!', body: 'Download our FREE optimizer. Only 14 minutes on a 28.8k modem.', details: [], dismissLabel: 'Close', acceptLabel: 'Optimize now', scamOutcome: 'The optimizer was spyware. It optimized your bank account.' },
  { design: 'alert', title: 'Security alert', headline: 'Your computer is broadcasting an IP address!', body: 'Click OK to scan your hard drive for problems.', details: [], dismissLabel: 'Cancel', acceptLabel: 'OK, scan', scamOutcome: 'The scan found 312 problems and a $39.95 fix for each one.' },
  { design: 'alert', title: 'Year 2000 warning', headline: 'Is your PC ready for the year 2000?', body: 'Only 3 years left. Buy our Y2K checker today.', details: [], dismissLabel: 'Later', acceptLabel: 'Buy checker', scamOutcome: 'The Y2K checker says you’re ready. It cost a fortune and it’s a text file.' },
  { design: 'prize', title: 'WINNER WINNER', headline: 'YOU WON A 56K MODEM!', body: 'Surf the web at blazing speeds. Claim before midnight!', details: [], dismissLabel: 'no thanks', acceptLabel: 'CLAIM PRIZE NOW >>', scamOutcome: 'You claimed the modem. Shipping and handling cost more than the modem.' },
  { design: 'prize', title: 'FREE FREE FREE', headline: '500 FREE SCREENSAVERS!', body: 'Aquariums. Starfields. Bouncing logos. All yours.', details: [], dismissLabel: 'maybe later', acceptLabel: 'DOWNLOAD ALL >>', scamOutcome: '500 screensavers, 1 surprise invoice.' },
  { design: 'prize', title: 'You have been chosen', headline: 'FREE CRUISE FOR TWO!', body: 'Just pay $49.99 shipping and handling.', details: [], dismissLabel: 'no thanks', acceptLabel: 'CLAIM CRUISE >>', scamOutcome: 'You claimed the free cruise. The shipping fee was everything.' },
  { design: 'download', title: 'Downloading...', headline: 'FREE_SCREENSAVERS.EXE', body: 'Saving to C:\\WINDOWS\\DESKTOP', details: ['Time left: 4 hours 12 minutes', 'Transfer rate: 2.1 KB/sec'], dismissLabel: 'Cancel', acceptLabel: '', scamOutcome: '' },
  { design: 'download', title: 'Downloading...', headline: 'spinning_skull.gif', body: 'Saving to C:\\MY DOCUMENTS\\COOL STUFF', details: ['Time left: 38 minutes', 'Transfer rate: 0.9 KB/sec'], dismissLabel: 'Cancel', acceptLabel: '', scamOutcome: '' },
  { design: 'download', title: 'Installing...', headline: 'COOL_CURSORS.EXE', body: 'Your mouse pointer will never be the same.', details: ['Time left: about 1 hour', 'Please do not pick up the phone'], dismissLabel: 'Cancel', acceptLabel: '', scamOutcome: '' },
];

export const WEB2_POPUPS: readonly PopupCopy[] = [
  { design: 'lightbox', title: 'Special offer', headline: 'Get the ringtone everyone has!', body: 'Text CRAZY to 55555. Only $9.99 a week, cancel never.', details: [], dismissLabel: 'Close', acceptLabel: 'Text CRAZY now', scamOutcome: 'You subscribed to the ringtone. $9.99 a week, forever.' },
  { design: 'lightbox', title: 'Advertisement', headline: 'Refinance your mortgage today', body: 'Rates have never been better. Nothing could possibly go wrong.', details: [], dismissLabel: 'Close', acceptLabel: 'Refinance now', scamOutcome: 'You refinanced. It’s 2005, what could go wrong? (Everything, in 2008.)' },
  { design: 'lightbox', title: 'Hot deal', headline: 'Free MP3 player!', body: 'Just sign up for 7 partner offers and refer 12 friends.', details: [], dismissLabel: 'No thanks', acceptLabel: 'Sign me up', scamOutcome: 'You signed up for 7 offers. The MP3 player never arrived.' },
  { design: 'survey', title: 'Quick survey', headline: 'You have been selected!', body: 'Answer one quick question and win a free MP3 player.', details: ['Under 18', '18 to 34', '35 or older'], dismissLabel: 'Skip', acceptLabel: 'Submit', scamOutcome: 'You answered the survey. The free MP3 player needed your card details.' },
  { design: 'survey', title: 'Poll of the day', headline: 'Which browser is the best?', body: 'Results will be posted on our blog.', details: ['The new one', 'The old one', 'What’s a browser?'], dismissLabel: 'Close', acceptLabel: 'Vote', scamOutcome: 'Your vote signed you up for a newsletter. A paid one.' },
  { design: 'survey', title: 'Help us improve', headline: 'How did you find this site?', body: 'Your feedback helps us serve you more ads.', details: ['A search engine', 'A friend’s blog', 'A pop-up ad'], dismissLabel: 'Skip', acceptLabel: 'Submit', scamOutcome: 'Thanks for the feedback! Your email is now on 40 mailing lists, and one of them bills you.' },
  { design: 'messenger', title: 'cool_dude_2005', headline: 'Instant message', body: '', details: ['hey', 'check out my new profile page!!', 'also my band. we have 3 songs'], dismissLabel: 'Close', acceptLabel: 'open his profile link', scamOutcome: 'The “profile” link installed a smiley pack you didn’t ask for, with a subscription.' },
  { design: 'messenger', title: 'sk8rgrl88', headline: 'Instant message', body: '', details: ['brb', 'ok back', 'lol did u see that video of the cat'], dismissLabel: 'Close', acceptLabel: 'watch the video', scamOutcome: 'The video needed a “codec”. The codec needed your credit card.' },
  { design: 'messenger', title: 'award_bot', headline: 'Instant message', body: '', details: ['Congratulations!!!', 'Your blog won BLOG OF THE YEAR', 'claim it at www.award-claim.example'], dismissLabel: 'Close', acceptLabel: 'claim the award', scamOutcome: 'The award cost $199 to claim. It’s a JPEG.' },
  { design: 'toolbar', title: 'Setup', headline: 'Install the SearchBuddy toolbar?', body: 'Your browser only has four toolbars. Add a fifth!', details: ['Make SearchBuddy my home page', 'Show me special offers'], dismissLabel: 'Skip', acceptLabel: 'Install', scamOutcome: 'SearchBuddy is now your home page, your search engine and, somehow, your landlord.' },
  { design: 'toolbar', title: 'Setup', headline: 'Get 10,000 FREE smileys!', body: 'For your emails, instant messages and blog comments.', details: ['Also install the weather bar', 'Send usage stats to improve the service'], dismissLabel: 'Cancel', acceptLabel: 'Install', scamOutcome: '10,000 smileys installed. So were a weather bar, two toolbars and a bill.' },
  { design: 'toolbar', title: 'Setup', headline: 'Download 300% faster!', body: 'Our accelerator makes the internet go faster. Probably.', details: ['Also install the coupon finder'], dismissLabel: 'Cancel', acceptLabel: 'Install', scamOutcome: 'The internet is not 300% faster. Your wallet is 100% lighter.' },
];
