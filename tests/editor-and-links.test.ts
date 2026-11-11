import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitialGameState, UPGRADE_IDS, UPGRADES_BY_ID } from '../src/engine';
import type { GameState, UpgradeId } from '../src/engine';
import { buildEditorTabs, buildEditorTitle, resolveEditorFile } from '../src/ui/browser-chrome';
import { LEARN_LINKS } from '../src/ui/learn-links';
import { buildEditorSource, mainEditorFile } from '../src/ui/skill-code';

const web2 = (skills: readonly UpgradeId[]): GameState => ({ ...createInitialGameState(1), eraId: 'web2-2005', purchasedUpgradeIds: [...skills] });

describe('editor files in 2005', () => {
  it('starts in blog.php, with style.css and ajax.js waiting for their skills', () => {
    assert.equal(mainEditorFile(web2([])), 'blog.php');
    assert.match(buildEditorSource(web2([]), 'style.css'), /still empty/);
    assert.match(buildEditorSource(web2([]), 'ajax.js'), /nothing here yet/);
  });

  it('puts CSS in style.css and links it from the page', () => {
    const state = web2(['learn-css', 'web2-design']);
    const css = buildEditorSource(state, 'style.css');
    assert.match(css, /#sidebar \{ float: right/);
    assert.match(css, /border-radius/);
    assert.doesNotMatch(css, /<style/);
    assert.match(buildEditorSource(state, 'blog.php'), /<link rel="stylesheet" type="text\/css" href="style.css" \/>/);
  });

  it('collects every JavaScript skill in ajax.js', () => {
    const js = buildEditorSource(web2(['learn-ajax', 'learn-jquery', 'learn-web-apis']), 'ajax.js');
    assert.match(js, /XMLHttpRequest/);
    assert.match(js, /\$\(document\)\.ready/);
    assert.match(js, /MapWidget/);
  });

  it('opens the main file when the picked file is not open (yet)', () => {
    assert.equal(resolveEditorFile(web2([]), '.htaccess'), 'blog.php');
    assert.equal(resolveEditorFile(web2(['learn-url-rewriting']), '.htaccess'), '.htaccess');
    assert.equal(resolveEditorFile(web2([]), null), 'blog.php');
  });

  it('names the open file in the title, with the SVN revision', () => {
    assert.match(buildEditorTitle(web2([]), 'style.css'), /^style\.css — /);
    assert.match(buildEditorTitle(web2(['svn']), 'ajax.js'), /^ajax\.js \(rev \d+\)/);
  });

  it('shows five tabs and hides the rest of the Enterprise Java XML behind "+N more"', () => {
    const tabs = buildEditorTabs(web2(['j2ee']));
    assert.equal(tabs.files.length, 5);
    assert.ok(tabs.hiddenCount > 0);
  });
});

describe('learn links', () => {
  it('links every skill to somewhere that teaches it, over https', () => {
    UPGRADE_IDS.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'skill').forEach((skillId) => {
      assert.match(LEARN_LINKS[skillId] ?? '', /^https:\/\//, skillId);
    });
  });

  it('uses https for every link it has', () => {
    Object.values(LEARN_LINKS).filter((url): url is string => url !== null).forEach((url) => assert.match(url, /^https:\/\//));
  });
});
