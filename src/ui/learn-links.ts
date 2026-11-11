import type { UpgradeId } from '../engine';

const MDN = 'https://developer.mozilla.org/en-US/docs';
const WIKIPEDIA = 'https://en.wikipedia.org/wiki';

/**
 * Where to learn the real thing behind each skill or boost, for the visited-links lists in the shop.
 * MDN first: it is accurate, and it still documents the old tags with a "deprecated" warning, which suits a
 * history game. Official docs where a technology has them; Wikipedia for history (Flash, IE6, Web 2.0).
 * Every id needs an entry, so a new skill can't ship without a decision: null means "nothing worth linking",
 * and those show as plain text instead of a link nobody can follow.
 */
export const LEARN_LINKS: Readonly<Record<UpgradeId, string | null>> = {
  // 1997 skills
  'img-tag': `${MDN}/Web/HTML/Element/img`,
  'font-tags': `${MDN}/Web/HTML/Element/font`,
  'body-background': `${MDN}/Web/HTML/Element/body`,
  hyperlinks: `${MDN}/Web/HTML/Element/a`,
  'marquee-blink': `${MDN}/Web/HTML/Element/marquee`,
  'cgi-forms': `${MDN}/Web/HTML/Element/form`,
  'table-layouts': `${MDN}/Web/HTML/Element/table`,
  'embed-tag': `${MDN}/Web/HTML/Element/embed`,
  'learn-javascript': `${MDN}/Web/JavaScript/Guide`,
  // 2005 skills
  'learn-css': `${MDN}/Web/CSS`,
  'learn-php': 'https://www.php.net/manual/en/getting-started.php',
  'web2-design': `${WIKIPEDIA}/Web_2.0`,
  'learn-flash': `${WIKIPEDIA}/Adobe_Flash`,
  'learn-url-rewriting': 'https://httpd.apache.org/docs/current/rewrite/',
  'learn-jquery': 'https://learn.jquery.com/',
  'learn-web-apis': `${MDN}/Web/API/Fetch_API/Using_Fetch`,
  'prepared-statements': 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
  'learn-ajax': `${MDN}/Glossary/AJAX`,
  'learn-rss': `${WIKIPEDIA}/RSS`,
  // 2011 skills
  'responsive-design': `${MDN}/Web/CSS/CSS_media_queries/Using_media_queries`,
  'learn-bootstrap': 'https://getbootstrap.com/docs/',
  'html5-media': `${MDN}/Web/HTML/Element/video`,
  'social-plugins': `${WIKIPEDIA}/Like_button`,
  'learn-nodejs': 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs',
  'learn-bcrypt': 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
  'learn-masonry': 'https://masonry.desandro.com/',
  'parallax-scrolling': 'https://en.wikipedia.org/wiki/Parallax_scrolling',
  'retina-images': 'https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio',
  'app-banner': null,
  'learn-rest-apis': 'https://developer.mozilla.org/en-US/docs/Glossary/REST',
  'learn-sass': 'https://sass-lang.com/guide/',
  mongodb: 'https://www.mongodb.com/docs/manual/introduction/',
  'git-push-deploys': 'https://git-scm.com/docs/git-push',
  autoscaling: 'https://en.wikipedia.org/wiki/Autoscaling',
  // 1997 boosts
  'counter-starts-at-ten-thousand': null,
  'html-validator': 'https://validator.w3.org/',
  'animated-gif-pack': `${WIKIPEDIA}/GIF#Animated_GIF`,
  'view-source': `${WIKIPEDIA}/View-source_URI_scheme`,
  'banner-exchange': `${WIKIPEDIA}/Web_banner`,
  'web-directories': `${WIKIPEDIA}/Web_directory`,
  'guestbook-smileys': null,
  'bigger-monitor': null,
  'meta-keywords': `${MDN}/Web/HTML/Element/meta`,
  'animated-banners': null,
  'more-midi-files': `${WIKIPEDIA}/MIDI`,
  'bigger-webring': `${WIKIPEDIA}/Webring`,
  'optimize-gifs': `${WIKIPEDIA}/GIF`,
  // 2005 boosts
  'ie6-hacks': `${WIKIPEDIA}/Internet_Explorer_6`,
  'xhtml-badges': `${WIKIPEDIA}/XHTML`,
  'glitter-text': null,
  'drop-vowels': null,
  svn: 'https://subversion.apache.org/',
  gzip: `${MDN}/Web/HTTP/Headers/Content-Encoding`,
  memcached: 'https://memcached.org/',
  cdn: `${MDN}/Glossary/CDN`,
  'page-cache': `${MDN}/Web/HTTP/Caching`,
  j2ee: `${WIKIPEDIA}/Jakarta_EE`,
  rails: 'https://guides.rubyonrails.org/',
  'syntax-highlighting': `${WIKIPEDIA}/Syntax_highlighting`,
  'perpetual-beta': `${WIKIPEDIA}/Perpetual_beta`,
  'contextual-text-ads': `${WIKIPEDIA}/Contextual_advertising`,
  permalinks: `${WIKIPEDIA}/Permalink`,
  'ajax-everything': null,
  'threaded-replies': `${WIKIPEDIA}/Conversation_threading`,
  folksonomy: `${WIKIPEDIA}/Folksonomy`,
  // 2018
  'learn-react': 'https://react.dev/learn',
  'learn-angular': 'https://angular.dev/overview',
  'learn-vue': 'https://vuejs.org/guide/introduction.html',
  'nextjs-ssr': 'https://nextjs.org/docs',
  'angular-universal': 'https://angular.dev/guide/ssr',
  'nuxt-ssr': 'https://nuxt.com/docs',
  'mobile-first': `${MDN}/Web/Progressive_web_apps/Guides/Best_practices`,
  'learn-payments': `${MDN}/Web/API/Payment_Request_API`,
  'learn-oauth': 'https://oauth.net/2/',
  'learn-websockets': `${MDN}/Web/API/WebSockets_API`,
  'lazy-loading': `${MDN}/Web/Performance/Lazy_loading`,
  'code-splitting': `${MDN}/Glossary/Code_splitting`,
  'growth-hacking': `${WIKIPEDIA}/Growth_hacking`,
};
