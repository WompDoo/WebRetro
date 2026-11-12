import type { FrameworkId } from '../../engine';

/** One line of the failing build: a name, and the one fact beside it that the rule is about. */
export interface BuildLineCopy {
  readonly code: string;
  readonly detail: string;
}

/** A broken line also has its story: what really happened, shown once you've removed it, or missed it. */
export interface BrokenLineCopy extends BuildLineCopy {
  readonly story: string;
}

/**
 * What breaks each framework's build. The game needs no web knowledge: the brief states one plain rule, and
 * every line shows the fact it's about (the name that got installed, a version, a date). The history is the
 * reward, not the test. Every pool holds more lines than the hardest level shows, and no name is in both.
 */
export interface BuildBreakCopy {
  /** The command that failed, at the top of the terminal. */
  readonly command: string;
  readonly brief: (featureName: string) => string;
  readonly broken: readonly BrokenLineCopy[];
  readonly working: readonly BuildLineCopy[];
}

const TYPOSQUAT_STORY = 'Typosquatting: a lookalike name, published to catch typos. Dozens were found on npm in 2017 and 2018.';
const LOCKSTEP_STORY = 'Angular’s packages move together: a single one left on the old version breaks the whole build.';

export const BUILD_BREAK_COPY: Readonly<Record<FrameworkId, BuildBreakCopy>> = {
  // React leaves the router, the state and the forms to npm: the most packages, and the most lookalikes.
  react: {
    command: 'npm install && npm run build',
    brief: (featureName) =>
      `Your ${featureName} won't load: some packages came back from npm as lookalikes, or not at all. Click every package where what got installed isn't what you asked for.`,
    broken: [
      { code: 'react-dom', detail: 'installed react-dorn@16.4.1', story: TYPOSQUAT_STORY },
      { code: 'cross-env', detail: 'installed crossenv@6.1.1', story: 'In 2017, crossenv was caught sending developers’ passwords and keys to its author.' },
      { code: 'left-pad', detail: 'installed nothing: 404 not found', story: 'In 2016 its author unpublished left-pad, eleven lines of code, and builds broke all over the web.' },
      { code: 'lodash', detail: 'installed lodahs@4.17.10', story: TYPOSQUAT_STORY },
      { code: 'babel-cli', detail: 'installed babelcli@6.26.0', story: 'babelcli was one of 38 lookalikes pulled from npm in 2017.' },
      { code: 'jquery', detail: 'installed jqeury@3.3.1', story: TYPOSQUAT_STORY },
    ],
    working: [
      { code: 'react', detail: 'installed react@16.4.1' },
      { code: 'react-router-dom', detail: 'installed react-router-dom@4.3.1' },
      { code: 'redux', detail: 'installed redux@4.0.0' },
      { code: 'axios', detail: 'installed axios@0.18.0' },
      { code: 'webpack', detail: 'installed webpack@4.12.0' },
      { code: 'babel-core', detail: 'installed babel-core@6.26.3' },
      { code: 'prop-types', detail: 'installed prop-types@15.6.2' },
      { code: 'moment', detail: 'installed moment@2.22.2' },
    ],
  },
  // Angular's come with each major version: ng update moves everything at once, and stragglers break the build.
  angular: {
    command: 'ng update && ng build --prod',
    brief: (featureName) =>
      `You updated to Angular 6, and your ${featureName} won't compile: everything has to move to version 6 together. Click every package still on version 5.`,
    broken: [
      { code: '@angular/router', detail: '5.2.0', story: LOCKSTEP_STORY },
      { code: '@angular/forms', detail: '5.2.9', story: LOCKSTEP_STORY },
      { code: 'rxjs', detail: '5.5.6', story: 'RxJS 6 changed how you chain operators: .map() became .pipe(map()). Every file written the old way broke.' },
      { code: '@angular/http', detail: '5.2.0', story: 'Angular’s first HTTP client. HttpClient replaced it; Angular 8 removed it.' },
      { code: '@angular/animations', detail: '5.2.0', story: LOCKSTEP_STORY },
      { code: '@angular/cdk', detail: '5.2.4', story: 'The Component Dev Kit follows Angular’s version numbers, so it has to update with it.' },
    ],
    working: [
      { code: '@angular/core', detail: '6.0.0' },
      { code: '@angular/common', detail: '6.0.0' },
      { code: '@angular/compiler', detail: '6.0.0' },
      { code: '@angular/platform-browser', detail: '6.0.0' },
      { code: '@angular/cli', detail: '6.0.0' },
      { code: '@angular/material', detail: '6.0.0' },
      { code: '@angular/compiler-cli', detail: '6.0.0' },
      { code: '@angular/language-service', detail: '6.0.0' },
    ],
  },
  // Vue's come from plugins: the core is steady, but plugins get abandoned, and some never left Vue 1.
  vue: {
    command: 'npm run build',
    brief: (featureName) =>
      `Your ${featureName} won't load: some plugins it uses have been abandoned. Click every plugin that hasn't been updated in over a year.`,
    broken: [
      { code: 'vue-resource', detail: 'last updated 2 years ago', story: 'The Vue team retired vue-resource in 2016 and pointed everyone to axios.' },
      { code: 'vue-validator', detail: 'last updated 2 years ago', story: 'Abandoned. Its users moved to vee-validate and Vuelidate.' },
      { code: 'vue-async-data', detail: 'last updated 3 years ago', story: 'Written for Vue 1. Vue 2 changed the API it hooked into.' },
      { code: 'vue-touch', detail: 'last updated 19 months ago', story: 'Its Vue 2 version stayed in beta for years, and never shipped.' },
      { code: 'vue-strap', detail: 'last updated 2 years ago', story: 'Bootstrap components for Vue 1, never updated for Vue 2.' },
      { code: 'vue-cli', detail: 'last updated 14 months ago', story: 'Replaced by @vue/cli in 2018. The old package was frozen.' },
    ],
    working: [
      { code: 'vue', detail: 'last updated 2 weeks ago' },
      { code: 'vue-router', detail: 'last updated 1 month ago' },
      { code: 'vuex', detail: 'last updated 3 weeks ago' },
      { code: 'axios', detail: 'last updated 2 months ago' },
      { code: 'vue-loader', detail: 'last updated 5 days ago' },
      { code: 'vue-i18n', detail: 'last updated 3 weeks ago' },
      { code: 'vee-validate', detail: 'last updated 1 week ago' },
      { code: 'vue-meta', detail: 'last updated 4 months ago' },
    ],
  },
};
