export type PopupDesign = 'dialog' | 'alert' | 'prize' | 'download' | 'lightbox' | 'survey' | 'messenger' | 'toolbar';

/** Every button either closes the pop-up for free or springs the scam. The title bar × is always safe. */
export type PopupButtonAction = 'dismiss' | 'scam';
export type PopupButtonStyle = 'button' | 'primary' | 'cta' | 'link';

export interface PopupButton {
  readonly label: string;
  readonly action: PopupButtonAction;
  readonly style: PopupButtonStyle;
}

export interface PopupCopy {
  readonly design: PopupDesign;
  readonly title: string;
  readonly headline: string;
  readonly body: string;
  /** Survey answers, checkbox labels, chat lines or download stats, depending on the design. */
  readonly details: readonly string[];
  /** Can be empty: then the × is the only way out. */
  readonly buttons: readonly PopupButton[];
  /** What happened when you fell for it. Shown in the news. */
  readonly scamOutcome: string;
}

const dismiss = (label: string, style: PopupButtonStyle = 'button'): PopupButton => ({ label, action: 'dismiss', style });
const scam = (label: string, style: PopupButtonStyle = 'button'): PopupButton => ({ label, action: 'scam', style });
const NO_DETAILS: readonly string[] = [];
const X_ONLY: readonly PopupButton[] = [];

export const HOMEPAGE_POPUPS: readonly PopupCopy[] = [
  // The shiny button is the only button. Find the ×.
  { design: 'dialog', title: 'Congratulations!!!', headline: 'YOU ARE THE 1,000,000th VISITOR!', body: 'Click OK to claim your FREE prize. This is not a joke!!!', details: NO_DETAILS, buttons: [scam('OK!!!')], scamOutcome: 'You clicked OK to claim your prize. The prize was a “processing fee”.' },
  // Harmless.
  { design: 'dialog', title: 'Message from the Webmaster', headline: 'Welcome to my homepage!!!', body: 'Please sign my guestbook before you leave. Please.', details: NO_DETAILS, buttons: [dismiss('OK')], scamOutcome: '' },
  { design: 'dialog', title: 'Chain letter', headline: 'Forward this to 10 friends!', body: 'A big software company will pay you $5 for every email you forward. My cousin got $800.', details: NO_DETAILS, buttons: [scam('Forward it'), dismiss('Delete')], scamOutcome: 'You forwarded it to 10 friends. Nobody paid you, and you bought a “premium forwarding license”.' },
  // Both buttons are traps. Classic.
  { design: 'alert', title: 'System warning', headline: 'Your PC may be running SLOW!', body: 'Download our FREE optimizer. Only 14 minutes on a 28.8k modem.', details: NO_DETAILS, buttons: [scam('OK'), scam('Cancel')], scamOutcome: 'Both buttons said yes. The optimizer was spyware, and it optimized your bank account.' },
  { design: 'alert', title: 'Security alert', headline: 'Your computer is broadcasting an IP address!', body: 'Click OK to scan your hard drive for problems.', details: NO_DETAILS, buttons: [scam('Scan now', 'primary'), dismiss('Cancel')], scamOutcome: 'The scan found 312 problems and a $39.95 fix for each one.' },
  { design: 'alert', title: 'Year 2000 warning', headline: 'Is your PC ready for the year 2000?', body: 'Only 3 years left. Act now. Or later. We’ll wait.', details: NO_DETAILS, buttons: X_ONLY, scamOutcome: '' },
  { design: 'prize', title: 'WINNER WINNER', headline: 'YOU WON A 56K MODEM!', body: 'Surf the web at blazing speeds. Claim before midnight!', details: NO_DETAILS, buttons: [scam('CLAIM PRIZE NOW >>', 'cta'), dismiss('no thanks', 'link')], scamOutcome: 'You claimed the modem. Shipping and handling cost more than the modem.' },
  { design: 'prize', title: 'FREE FREE FREE', headline: '500 FREE SCREENSAVERS!', body: 'Aquariums. Starfields. Bouncing logos. All yours.', details: NO_DETAILS, buttons: [scam('click here', 'link')], scamOutcome: '500 screensavers, 1 surprise invoice.' },
  { design: 'prize', title: 'You have been chosen', headline: 'FREE CRUISE FOR TWO!', body: 'Just pay $49.99 shipping and handling.', details: NO_DETAILS, buttons: [scam('CLAIM CRUISE >>', 'cta')], scamOutcome: 'You claimed the free cruise. The shipping fee was everything.' },
  { design: 'download', title: 'Downloading...', headline: 'FREE_SCREENSAVERS.EXE', body: 'Saving to C:\\WINDOWS\\DESKTOP', details: ['Time left: 4 hours 12 minutes', 'Transfer rate: 2.1 KB/sec'], buttons: [dismiss('Cancel')], scamOutcome: '' },
  { design: 'download', title: 'Download complete', headline: 'spinning_skull.gif.exe', body: 'Saved to C:\\MY DOCUMENTS\\COOL STUFF', details: ['Size: 1.4 MB', 'Publisher: unknown'], buttons: [scam('Open', 'primary'), dismiss('Close')], scamOutcome: 'It was not a GIF. Your PC now plays a skull sound on startup and you paid to remove it.' },
  { design: 'download', title: 'Installing...', headline: 'COOL_CURSORS.EXE', body: 'Your mouse pointer will never be the same.', details: ['Time left: about 1 hour', 'Please do not pick up the phone'], buttons: X_ONLY, scamOutcome: '' },
];

export const WEB2_POPUPS: readonly PopupCopy[] = [
  { design: 'lightbox', title: 'Special offer', headline: 'Get the ringtone everyone has!', body: 'Text CRAZY to 55555. Only $9.99 a week, cancel never.', details: NO_DETAILS, buttons: [scam('Text CRAZY now', 'primary'), dismiss('Close')], scamOutcome: 'You subscribed to the ringtone. $9.99 a week, forever.' },
  { design: 'lightbox', title: 'Advertisement', headline: 'Refinance your mortgage today', body: 'Rates have never been better. Nothing could possibly go wrong.', details: NO_DETAILS, buttons: [scam('Refinance now', 'primary')], scamOutcome: 'You refinanced. It’s 2005, what could go wrong? (Everything, in 2008.)' },
  { design: 'lightbox', title: 'Hot deal', headline: 'Free MP3 player!', body: 'Just sign up for 7 partner offers and refer 12 friends.', details: NO_DETAILS, buttons: [scam('Click here to claim', 'link'), dismiss('No thanks')], scamOutcome: 'You signed up for 7 offers. The MP3 player never arrived.' },
  { design: 'survey', title: 'Quick survey', headline: 'You have been selected!', body: 'Answer one quick question and win a free MP3 player.', details: ['Under 18', '18 to 34', '35 or older'], buttons: [scam('Submit', 'primary'), dismiss('Skip')], scamOutcome: 'You answered the survey. The free MP3 player needed your card details.' },
  { design: 'survey', title: 'Poll of the day', headline: 'Which browser is the best?', body: 'Results will be posted on our blog.', details: ['The new one', 'The old one', 'What’s a browser?'], buttons: [scam('Vote', 'primary')], scamOutcome: 'Your vote signed you up for a newsletter. A paid one.' },
  { design: 'survey', title: 'Help us improve', headline: 'How did you find this site?', body: 'Your feedback helps us serve you more ads.', details: ['A search engine', 'A friend’s blog', 'A pop-up ad'], buttons: [dismiss('Skip')], scamOutcome: '' },
  { design: 'messenger', title: 'cool_dude_2005', headline: 'Instant message', body: '', details: ['hey', 'check out my new profile page!!', 'also my band. we have 3 songs'], buttons: [scam('www.cool-dude-profile.example', 'link')], scamOutcome: 'The “profile” link installed a smiley pack you didn’t ask for, with a subscription.' },
  { design: 'messenger', title: 'sk8rgrl88', headline: 'Instant message', body: '', details: ['brb', 'ok back', 'lol nvm'], buttons: X_ONLY, scamOutcome: '' },
  { design: 'messenger', title: 'award_bot', headline: 'Instant message', body: '', details: ['Congratulations!!!', 'Your blog won BLOG OF THE YEAR', 'claim it here before it expires:'], buttons: [scam('www.award-claim.example', 'link')], scamOutcome: 'The award cost $199 to claim. It’s a JPEG.' },
  { design: 'toolbar', title: 'Setup', headline: 'Install the SearchBuddy toolbar?', body: 'Your browser only has four toolbars. Add a fifth!', details: ['Make SearchBuddy my home page', 'Show me special offers'], buttons: [scam('Install', 'primary'), dismiss('Skip')], scamOutcome: 'SearchBuddy is now your home page, your search engine and, somehow, your landlord.' },
  // Bundleware: "Cancel" installs it too.
  { design: 'toolbar', title: 'Setup', headline: 'Get 10,000 FREE smileys!', body: 'For your emails, instant messages and blog comments.', details: ['Also install the weather bar', 'Send usage stats to improve the service'], buttons: [scam('Install', 'primary'), scam('Cancel')], scamOutcome: 'You pressed Cancel. It installed anyway: 10,000 smileys, a weather bar and a bill.' },
  { design: 'toolbar', title: 'Setup', headline: 'Download 300% faster!', body: 'Our accelerator makes the internet go faster. Probably.', details: ['Also install the coupon finder'], buttons: [scam('Accept and install', 'primary'), dismiss('Decline', 'link')], scamOutcome: 'The internet is not 300% faster. Your wallet is 100% lighter.' },
];
