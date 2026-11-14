import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateDemandVisitorsPerSecond,
  calculateLoadTimeSeconds,
  calculatePageWeightKb,
  createInitialGameState,
  createPlaytestState,
  ERAS_BY_ID,
  findChosenFramework,
  getAvailableSkillIds,
  getFeatureDisplayName,
  getDefenseCopy,
  getUnlockedDefenseIds,
  isFeatureOnPage,
  getEraHostingTiers,
  getFeaturesRetiringIn,
  isFeaturePluginDead,
  isFeatureRetired,
  isRenderedOnlyInBrowser,
  isUpgradeRetired,
} from '../src/engine';
import type { GameState, UpgradeId } from '../src/engine';
import { buildEditorTabs, buildSiteUrl, measureNodeModulesMb, rateLighthouse, scoreLighthouse } from '../src/ui/browser-chrome';
import { FRAMEWORK_PRESENTATION, resolveTyping } from '../src/ui/framework-presentation';
import { renderSite } from '../src/ui/sites';
import { buildEditorSource, mainEditorFile } from '../src/ui/skill-code';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 2018;
const NOW = 0;
const base = createInitialGameState(SEED);
const in2018 = (skills: readonly UpgradeId[] = []): GameState => ({
  ...base,
  eraId: 'platform-2018',
  hazardCountdownsMs: QUIET_HAZARDS,
  purchasedUpgradeIds: ['learn-php', 'learn-bootstrap', 'responsive-design', 'learn-rest-apis', ...skills],
  featureLevels: { ...base.featureLevels, blog: 10, 'video-player': 5, 'social-login': 3, 'share-buttons': 15, forum: 4, 'one-pager': 2 },
  adCount: 6,
});

describe('2018: the era itself', () => {
  it('follows 2011 and leads into 2024', () => {
    assert.equal(ERAS_BY_ID['social-2011'].nextEraId, 'platform-2018');
    assert.equal(ERAS_BY_ID['platform-2018'].nextEraId, 'ai-2024');
  });

  it('retires share counters, the forum and the one-pager, and stops the "Get our app!" banner', () => {
    const state = in2018();
    assert.deepEqual([...getFeaturesRetiringIn(state, 'platform-2018')].sort(), ['forum', 'one-pager', 'share-buttons']);
    assert.ok(isFeatureRetired(state, 'share-buttons'));
    assert.ok(isUpgradeRetired(state, 'app-banner'));
    assert.ok(!isUpgradeRetired({ ...state, eraId: 'social-2011' }, 'app-banner'));
  });

  it('takes the retired banner off the page: its weight goes with it', () => {
    const withBanner = { ...in2018(), purchasedUpgradeIds: [...in2018().purchasedUpgradeIds, 'app-banner' as const] };
    assert.equal(calculatePageWeightKb(withBanner), calculatePageWeightKb(in2018()));
  });

  it('switches the comments off, and CAPTCHA goes with them: nothing left for spam bots', () => {
    const withComments: GameState = { ...in2018(), featureLevels: { ...in2018().featureLevels, comments: 8 }, ownedDefenseIds: ['captcha'], enabledDefenseIds: ['captcha'] };
    assert.ok(getFeaturesRetiringIn(withComments, 'platform-2018').includes('comments'));
    assert.ok(!isFeatureOnPage(withComments, 'comments'));
    assert.ok(!getUnlockedDefenseIds(withComments).includes('captcha'));
    assert.ok(getUnlockedDefenseIds({ ...withComments, eraId: 'social-2011' }).includes('captcha'));
    assert.match(renderSite({ ...withComments, purchasedUpgradeIds: [...withComments.purchasedUpgradeIds, 'learn-vue'] }, NOW), /Comments are off/);
  });

  it('calls the pop-up defense an ad blocker from 2011', () => {
    assert.equal(getDefenseCopy('premium-ad-network', 'web2-2005').name, 'Premium ad network');
    assert.equal(getDefenseCopy('premium-ad-network', 'social-2011').name, 'Ad blocker');
    assert.equal(getDefenseCopy('premium-ad-network', 'platform-2018').name, 'Ad blocker');
  });

  it('shows every ad placed: sponsored posts in 2011, a banner and clickbait in 2018', () => {
    const count = (html: string, className: string): number => html.split(`class="${className}"`).length - 1;
    const in2011 = { ...in2018(), eraId: 'social-2011' as const, adCount: 4 };
    assert.equal(count(renderSite(in2011, NOW), 'bs-ad'), 4);
    const landing = renderSite({ ...in2018(['learn-react']), adCount: 5 }, NOW);
    assert.equal(count(landing, 'lp-leaderboard'), 1);
    assert.equal(count(landing, 'lp-chum'), 4);
  });

  it('breaks Sign in with Facespace when its API shuts, until you build your own login', () => {
    assert.ok(isFeaturePluginDead(in2018(), 'social-login'));
    assert.ok(!isFeaturePluginDead(in2018(['learn-oauth']), 'social-login'));
    assert.ok(!isFeaturePluginDead({ ...in2018(), eraId: 'social-2011' }, 'social-login'));
  });

  it('runs on Kubernetes: the relaunch starts on three pods, for free', () => {
    const [first, second] = getEraHostingTiers('platform-2018');
    assert.equal(first?.name, 'Kubernetes: 3 pods');
    assert.equal(first?.cost, 0);
    assert.ok((second?.cost ?? 0) > 0);
  });
});

describe('2018: the framework wars', () => {
  it('offers all three until one is picked, then none of the others', () => {
    const offered = (state: GameState): readonly UpgradeId[] => getAvailableSkillIds(state).filter((id) => ['learn-react', 'learn-angular', 'learn-vue'].includes(id));
    assert.deepEqual([...offered(in2018())].sort(), ['learn-angular', 'learn-react', 'learn-vue']);
    assert.deepEqual(offered(in2018(['learn-angular'])), []);
    assert.equal(findChosenFramework(in2018(['learn-angular'])), 'angular');
  });

  it('offers only the picked framework’s own server rendering', () => {
    const ssr = (state: GameState): readonly UpgradeId[] => getAvailableSkillIds(state).filter((id) => ['nextjs-ssr', 'angular-universal', 'nuxt-ssr'].includes(id));
    assert.deepEqual(ssr(in2018()), []);
    assert.deepEqual(ssr(in2018(['learn-angular'])), ['angular-universal']);
    assert.deepEqual(ssr(in2018(['learn-vue'])), ['nuxt-ssr']);
  });

  it('makes the page blank until the JavaScript runs: slower, and search visitors lost, until server rendering', () => {
    const browserOnly = in2018(['learn-react']);
    const serverRendered = in2018(['learn-react', 'nextjs-ssr']);
    assert.ok(isRenderedOnlyInBrowser(browserOnly));
    assert.ok(!isRenderedOnlyInBrowser(serverRendered));
    assert.ok(calculateLoadTimeSeconds(browserOnly) > calculateLoadTimeSeconds(serverRendered));
    assert.ok(calculateDemandVisitorsPerSecond(serverRendered) > calculateDemandVisitorsPerSecond(browserOnly));
  });

  it('weighs each framework differently: Angular ships the most, Vue the least', () => {
    const weight = (skill: UpgradeId): number => calculatePageWeightKb(in2018([skill]));
    assert.ok(weight('learn-angular') > weight('learn-react'));
    assert.ok(weight('learn-react') > weight('learn-vue'));
  });

  it('keeps every playtest end preset to one framework', () => {
    (['react', 'angular', 'vue'] as const).forEach((framework) => assert.equal(findChosenFramework(createPlaytestState('platform-2018', 'end', SEED, framework)), framework));
  });
});

describe('2018: how each framework shows', () => {
  it('rewrites the page as a landing page that says what built it, and boots its own way', () => {
    const angular = renderSite(in2018(['learn-angular']), NOW);
    assert.match(angular, /site-2018 fw-angular/);
    assert.match(angular, /Built with Angular/);
    assert.match(angular, /<div class="spa-boot-screen">Loading\.\.\.<\/div>/);
    assert.match(renderSite(in2018(['learn-vue']), NOW), /\{\{ hero\.title \}\}/);
    assert.match(renderSite(in2018(['learn-react']), NOW), /<div class="spa-boot-screen"><\/div>/);
  });

  it('keeps the 2011 page, and the dead login box, until a framework rewrites it', () => {
    const page = renderSite(in2018(), NOW);
    assert.match(page, /site-2011/);
    assert.match(page, /This app is no longer available/);
  });

  it('types into each framework’s own file, with its own idea of a typo', () => {
    assert.equal(mainEditorFile(in2018()), 'index.html');
    assert.equal(mainEditorFile(in2018(['learn-angular'])), 'app.component.ts');
    assert.match(buildEditorSource(in2018(['learn-angular']), 'app.component.ts'), /@Component\(\{/);
    assert.match(buildEditorSource(in2018(['learn-react']), 'App.jsx'), /class App extends Component/);
    assert.match(buildEditorSource(in2018(['learn-vue']), 'App.vue'), /<template>/);
    assert.equal(resolveTyping(in2018(['learn-angular'])).typoLabel, FRAMEWORK_PRESENTATION.angular.typing.typoLabel);
    assert.equal(resolveTyping(in2018()).typoLabel, 'typosquat!');
  });

  it('opens every file as a real tab: only 2005 hides its pile of XML behind "+N more"', () => {
    const angular = buildEditorTabs(createPlaytestState('platform-2018', 'end', SEED, 'angular'));
    assert.equal(angular.hiddenCount, 0);
    assert.ok(angular.files.length > 5);
    assert.ok(angular.files.includes('app.server.module.ts'));
  });

  it('keeps the names features got in 2011, unless 2018 renamed them', () => {
    assert.equal(getFeatureDisplayName('photo-gallery', 'platform-2018'), 'Photo albums');
    assert.equal(getFeatureDisplayName('midi-player', 'platform-2018'), 'Podcast player');
    assert.equal(getFeatureDisplayName('guestbook', 'platform-2018'), 'Reviews');
    assert.equal(getFeatureDisplayName('guestbook', 'social-2011'), 'Wall');
    assert.match(renderSite(in2018(['learn-react']), NOW), /<h2 class="feature-heading">Video<\/h2>/);
  });

  it('serves over https once certificates are automated, and Vue’s router puts a # in the address', () => {
    assert.equal(buildSiteUrl(in2018(['learn-react'])), 'http://www.myhomepage.com/');
    assert.equal(buildSiteUrl(in2018(['learn-react', 'certificate-automation'])), 'https://www.myhomepage.com/');
    assert.equal(buildSiteUrl(in2018(['learn-vue', 'certificate-automation'])), 'https://www.myhomepage.com/#/');
  });

  it('grows node_modules with every keystroke, fastest for React', () => {
    const after = (skill: UpgradeId): number => measureNodeModulesMb({ ...in2018([skill]), keystrokes: 10_000 }) - measureNodeModulesMb({ ...in2018([skill]), keystrokes: 0 });
    assert.ok(after('learn-react') > after('learn-vue'));
    assert.ok(after('learn-vue') > after('learn-angular'));
  });
});

describe('2018: the speed score', () => {
  it('scores a fast, still page green and a slow, jumpy one red', () => {
    assert.equal(rateLighthouse(scoreLighthouse({ largestPaintSeconds: 1, inputDelayMs: 50, layoutShift: 0 })), 'good');
    assert.equal(rateLighthouse(scoreLighthouse({ largestPaintSeconds: 6, inputDelayMs: 500, layoutShift: 0.4 })), 'poor');
  });

  it('scores 100 for a perfect page and drops with each vital', () => {
    const perfect = scoreLighthouse({ largestPaintSeconds: 0, inputDelayMs: 0, layoutShift: 0 });
    assert.equal(perfect, 100);
    assert.ok(scoreLighthouse({ largestPaintSeconds: 3, inputDelayMs: 0, layoutShift: 0 }) < perfect);
    assert.ok(scoreLighthouse({ largestPaintSeconds: 0, inputDelayMs: 0, layoutShift: 0.3 }) < perfect);
  });
});
