import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chooseSiteColors, createEraRecord, createPlaytestState, SPECIALIZATION_IDS } from '../src/engine';
import type { EraId, GameState, SiteColors, SpecializationId } from '../src/engine';
import { calculateLuminance, hexToHsl, hslToHex, mixHex, pickInk, rotateHue } from '../src/ui/color-math';
import { describeWheelShade, placeOnWheel, readWheelPoint, renderSiteColorsPanel } from '../src/ui/render-site-colors';
import { buildThemeVariables, findEffectiveColors, SITE_PALETTES, wrapInSiteTheme } from '../src/ui/site-theme';
import { calculateSiteSignature, renderSite, siteBrand } from '../src/ui/sites';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 31;
const NOW = 0;
const testBuild = (state: GameState): GameState => ({ ...state, edition: 'webspecialization' });
const at = (eraId: EraId, stage: 'start' | 'end' = 'end'): GameState =>
  testBuild({ ...createPlaytestState(eraId, stage, SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS, infections: [], popups: [], isCookieBannerDismissed: true });
const as = (state: GameState, specializationId: SpecializationId): GameState => ({ ...state, specializationId });
const OCEAN: SiteColors = { accent: '#1864AB', background: 'white' };

describe('a specialized site looks the part', () => {
  it('leads 2011’s Bootstrap page with what it is: its own navigation, hero and block', () => {
    const page = renderSite(as(at('social-2011'), 'video'), NOW);
    assert.match(page, /<h1>Upload\. Watch\. Repeat\.<\/h1>/);
    assert.match(page, /<span class="is-active">Home<\/span><span>Trending<\/span><span>Subscriptions<\/span>/);
    assert.match(page, /spec-block--video[\s\S]*Trending now[\s\S]*Cat plays the keyboard/);
    assert.match(page, /class="site-2011[^"]* is-spec-video"/);
    assert.doesNotMatch(page, /Hello, world!/);
  });

  it('keeps the template on Platform, and the classic game never changes', () => {
    assert.match(renderSite(at('social-2011'), NOW), /Hello, world!/);
    const classic: GameState = { ...as(at('social-2011'), 'video'), edition: 'classic' };
    assert.match(renderSite(classic, NOW), /Hello, world!/);
    assert.doesNotMatch(renderSite(classic, NOW), /spec-block|site-theme/);
  });

  it('dresses the 2018 landing page and the 2024 AI page too, each with that era’s words', () => {
    const shop2018 = renderSite(as(at('platform-2018'), 'shop'), NOW);
    assert.match(shop2018, /One click, and it’s yours\./);
    assert.match(shop2018, /Today’s deals[\s\S]*Rubber duck/);
    const news2024 = renderSite(as(at('ai-2024'), 'news'), NOW);
    assert.match(news2024, /<span class="ai-gradient">The news, summarized\.<\/span>/);
    assert.match(news2024, /<nav class="ai-links"><span>Top stories<\/span>/);
  });

  it('has a page for every specialization in every era it shapes', () => {
    const looked = SPECIALIZATION_IDS.filter((id) => id !== 'platform');
    const eras: readonly EraId[] = ['social-2011', 'platform-2018', 'ai-2024'];
    eras.forEach((eraId) => looked.forEach((id) => assert.match(renderSite(as(at(eraId), id), NOW), new RegExp(`spec-block--${id}`), `${id} in ${eraId}`)));
  });

  it('is a homepage like everyone’s before 2011', () => {
    assert.doesNotMatch(renderSite(as(at('web2-2005'), 'video'), NOW), /spec-block/);
  });

  it('puts the site’s name in the hero', () => {
    const named = { ...as(at('ai-2024'), 'shop'), siteName: 'Mega Mart' };
    assert.match(renderSite(named, NOW), new RegExp(`The ${siteBrand(named)} assistant finds what you need`));
  });

  it('re-renders when the site specializes or changes color', () => {
    const state = at('social-2011');
    assert.notEqual(calculateSiteSignature(state), calculateSiteSignature(as(state, 'photos')));
    assert.notEqual(calculateSiteSignature(state), calculateSiteSignature(chooseSiteColors(state, OCEAN)));
  });
});

describe('the site’s colors', () => {
  it('turn hex into HSL and back for every palette', () => {
    SITE_PALETTES.forEach((palette) => assert.equal(hslToHex(hexToHsl(palette.colors.accent)), palette.colors.accent, palette.name));
    assert.deepEqual(hexToHsl('#808080'), { hue: 0, saturation: 0, lightness: 128 / 255 });
    assert.equal(hslToHex({ hue: 120, saturation: 1, lightness: 0.5 }), '#00FF00');
    assert.equal(hslToHex({ hue: 480, saturation: 1, lightness: 0.5 }), '#00FF00', 'round the wheel and back');
  });

  it('mix, turn and pick readable text', () => {
    assert.equal(mixHex('#FFFFFF', '#000000', 0.5), '#808080');
    assert.equal(rotateHue('#FF0000', 120), '#00FF00');
    assert.equal(pickInk('#FFEE00'), '#111111');
    assert.equal(pickInk('#1864AB'), '#FFFFFF');
    assert.equal(calculateLuminance('#FFFFFF'), 1);
  });

  it('read the wheel where it was drawn: a point placed on the wheel reads back as the same color', () => {
    const box = { left: 10, top: 20, width: 200 };
    const color = { hue: 210, saturation: 0.6, lightness: 0.5 };
    const placed = placeOnWheel(color);
    const point = readWheelPoint(box, box.left + (placed.left / 100) * box.width, box.top + (placed.top / 100) * box.width);
    assert.ok(Math.abs(point.hue - color.hue) < 1e-6 && Math.abs(point.saturation - color.saturation) < 1e-6, JSON.stringify(point));
    assert.equal(readWheelPoint(box, 1_000, 120).saturation, 1, 'past the rim is the rim');
    assert.equal(describeWheelShade(0.5), 'rgba(255, 255, 255, 0.00)');
    assert.equal(describeWheelShade(0.25), 'rgba(0, 0, 0, 0.50)');
  });

  it('are kept only as #RRGGBB, uppercased; anything else is ignored, and null goes back to the page’s own', () => {
    const state = at('web2-2005');
    assert.deepEqual(chooseSiteColors(state, { accent: '#1864ab', background: 'cream' }).siteColors, { accent: '#1864AB', background: 'cream' });
    assert.equal(chooseSiteColors(state, { accent: 'red', background: 'white' }), state);
    assert.equal(chooseSiteColors(chooseSiteColors(state, OCEAN), null).siteColors, null);
  });

  it('theme the page in the test build: picked colors first, a specialization’s own otherwise', () => {
    const plain = at('web2-2005');
    assert.equal(findEffectiveColors(plain), null);
    assert.match(wrapInSiteTheme(plain, '<p>'), /^<div class="site-theme"><p><\/div>$/, 'wrapped, so a drag can preview, but not themed');
    assert.match(wrapInSiteTheme(chooseSiteColors(plain, OCEAN), '<p>'), /class="site-theme is-themed" style="--site-accent:#1864AB;/);
    assert.equal(findEffectiveColors(as(at('social-2011'), 'video'))?.accent, '#E03131');
    assert.equal(findEffectiveColors(chooseSiteColors(as(at('social-2011'), 'video'), OCEAN))?.accent, '#1864AB');
    assert.equal(wrapInSiteTheme({ ...chooseSiteColors(plain, OCEAN), edition: 'classic' }, '<p>'), '<p>');
  });

  it('derive every shade the era stylesheets use', () => {
    const variables = buildThemeVariables({ accent: '#1864AB', background: 'cream' });
    ['--site-accent-strong', '--site-accent-deep', '--site-accent-soft', '--site-accent-line', '--site-accent-light', '--site-accent-ink', '--site-accent-2', '--site-accent-3', '--site-light-2', '--site-light-3'].forEach((name) =>
      assert.match(variables, new RegExp(`${name}:#[0-9A-F]{6}`), name),
    );
    assert.match(variables, /--site-bg:#FBF6EC/);
  });

  it('stay in the Web Attic: each year’s page keeps the colors it had', () => {
    const colored = chooseSiteColors(at('web2-2005'), { accent: '#2B8A3E', background: 'tint' });
    const record = createEraRecord(colored);
    assert.deepEqual(record.site.siteColors, { accent: '#2B8A3E', background: 'tint' });
  });

  it('are picked in a panel: palettes, the wheel, a slider, three backgrounds and a way back', () => {
    const panel = renderSiteColorsPanel(chooseSiteColors(at('web2-2005'), SITE_PALETTES[0]?.colors ?? OCEAN));
    assert.equal(panel.match(/data-action="site-palette"/g)?.length, SITE_PALETTES.length);
    assert.match(panel, /data-id="ocean" aria-pressed="true"/);
    assert.match(panel, /data-color-wheel/);
    assert.match(panel, /data-color-lightness type="range"/);
    assert.equal(panel.match(/data-action="site-background"/g)?.length, 3);
    assert.doesNotMatch(panel, /data-action="site-colors-reset" disabled/);
    assert.match(renderSiteColorsPanel(at('web2-2005')), /data-action="site-colors-reset" disabled/);
  });
});
