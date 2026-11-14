import type { EraId, GameState } from '../../engine';
import { escapeHtml } from '../dom';
import { siteBrand } from './site-context';

/** The browser's page in front of a site whose certificate ran out. {host} is the site's address. */
interface CertificateWarningCopy {
  readonly title: string;
  readonly lines: readonly string[];
  /** The technical detail in small print, for the few who read it. */
  readonly detail: string;
  readonly button: string;
}

const HOST_TOKEN = '{host}';

const CERTIFICATE_WARNINGS: Readonly<Record<EraId, CertificateWarningCopy>> = {
  // Never shown: nothing in 1997 is served over https. Here so every era has an answer.
  'homepage-1997': {
    title: 'Certificate Expired',
    lines: [`${HOST_TOKEN} is a site that uses encryption to protect transmitted information. However, the certificate it uses has expired.`],
    detail: 'Do you want to continue anyway?',
    button: 'Cancel',
  },
  'web2-2005': {
    title: 'There is a problem with this website’s security certificate.',
    lines: [
      'The security certificate presented by this website has expired or is not yet valid.',
      'Security certificate problems may indicate an attempt to fool you or intercept any data you send to the server.',
      'We recommend that you close this webpage and do not continue to this website.',
    ],
    detail: 'Continue to this website (not recommended).',
    button: 'Click here to close this webpage.',
  },
  'social-2011': {
    title: 'This Connection is Untrusted',
    lines: [
      `You have asked your browser to connect securely to ${HOST_TOKEN}, but we can’t confirm that your connection is secure.`,
      'Normally, when you try to connect securely, sites will present trusted identification to prove that you are going to the right place. However, this site’s identity can’t be verified.',
    ],
    detail: `${HOST_TOKEN} uses an invalid security certificate. The certificate has expired. (Error code: sec_error_expired_certificate)`,
    button: 'Get me out of here!',
  },
  'platform-2018': {
    title: 'Your connection is not private',
    lines: [`Attackers might be trying to steal your information from ${HOST_TOKEN} (for example, passwords, messages, or credit cards).`],
    detail: 'NET::ERR_CERT_DATE_INVALID',
    button: 'Back to safety',
  },
  'ai-2024': {
    title: 'Your connection is not private',
    lines: [`Attackers might be trying to steal your information from ${HOST_TOKEN} (for example, passwords, messages, or credit cards).`],
    detail: 'NET::ERR_CERT_DATE_INVALID',
    button: 'Back to safety',
  },
};

const ERA_CLASSES: Readonly<Record<EraId, string>> = {
  'homepage-1997': 'is-1997',
  'web2-2005': 'is-2005',
  'social-2011': 'is-2011',
  'platform-2018': 'is-2018',
  'ai-2024': 'is-2018',
};

function fillHost(text: string, host: string): string {
  return escapeHtml(text).split(HOST_TOKEN).join(`<strong>${escapeHtml(host)}</strong>`);
}

/** What visitors get instead of your page while the certificate is expired: most of them press the button and leave. */
export function renderCertificateWarning(state: GameState): string {
  const copy = CERTIFICATE_WARNINGS[state.eraId];
  const host = `www.${siteBrand(state)}.com`;
  const lines = copy.lines.map((line) => `<p>${fillHost(line, host)}</p>`).join('');
  return `<div class="cert-warning ${ERA_CLASSES[state.eraId]}"><div class="cert-warning-body">
    <div class="cert-warning-icon" aria-hidden="true">⚠</div>
    <h1 class="cert-warning-title">${escapeHtml(copy.title)}</h1>
    ${lines}
    <p class="cert-warning-code">${fillHost(copy.detail, host)}</p>
    <span class="cert-warning-button">${escapeHtml(copy.button)}</span>
  </div></div>`;
}
