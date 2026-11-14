import type { EraId } from '../engine';
import { BLOG_POSTS, COMMENTS } from './presentation';
import type { BlogPostCopy, MessageCopy } from './presentation';

/**
 * What the site says, era by era. A feature keeps its place on the page through every relaunch, but what's in it
 * moves on: 2011's blog writes about going mobile, not about AJAX, and 2024's photo album is half generated.
 * Found by reading every era's page as text: before this, 2005's posts and forum threads ran on every page to 2024.
 */
export interface SiteContent {
  readonly blogPosts: readonly BlogPostCopy[];
  readonly comments: readonly MessageCopy[];
  readonly forumThreads: readonly string[];
  readonly activity: readonly string[];
  readonly photoNames: readonly string[];
  readonly videos: readonly string[];
}

const WEB2_FORUM: readonly string[] = [
  '[STICKY] Read this before posting!!',
  'Re: Re: Re: help!!',
  'Post your desktop screenshots',
  'Is AJAX a fad? (poll)',
  'Which PHP framework should I use? (3 pages)',
  'My site got hacked :(',
  'Introduce yourself here',
  'Signature test, please ignore',
];

const SOCIAL_COMMENTS: readonly MessageCopy[] = [
  { author: 'sam_k', text: 'Liked this from my phone!' },
  { author: 'ana.p', text: 'Rechirped. Is that the word?' },
  { author: 'jo', text: 'Does this work on the tablet?' },
  { author: 'theo', text: 'first (from mobile)' },
  { author: 'mel_b', text: 'Shared to my wall.' },
  { author: 'rik', text: 'Can I log in with Facespace?' },
];

const SOCIAL_ACTIVITY: readonly string[] = [
  'Sam liked “My first post”',
  'Ana shared a photo from your album',
  'Jo checked in at your Check-in map',
  'Theo commented: “is this on the app?”',
  'mel_b is now following you',
  'Rik shared the cat video (again)',
  'Grandma Rose liked everything',
];

const WEB2_CONTENT: SiteContent = {
  blogPosts: BLOG_POSTS,
  comments: COMMENTS,
  forumThreads: WEB2_FORUM,
  activity: SOCIAL_ACTIVITY,
  photoNames: ['beach.jpg', 'garden.jpg', 'office.jpg', 'cat.jpg', 'party.jpg', 'flag.jpg', 'DSC00412.JPG', 'webcam.jpg'],
  videos: ['cat_vs_printer.mp4', 'my_first_vlog.mp4', 'skateboard_fail.mp4'],
};

const SOCIAL_CONTENT: SiteContent = {
  blogPosts: [
    { title: 'We’re mobile now', date: 'Jun 2, 2011', excerpt: 'One site for every screen. No more pinching to zoom.' },
    { title: 'Is Flash dead?', date: 'Jul 14, 2011', excerpt: 'Our video plays without a plugin. Our intro doesn’t play at all.' },
    { title: 'Why we moved to the cloud', date: 'Aug 30, 2011', excerpt: 'No more servers in the closet. Now they’re in someone else’s.' },
    { title: 'Follow us everywhere', date: 'Oct 3, 2011', excerpt: 'Facespace, Chirper, and a page on that new one with the circles.' },
    { title: '5 things we learned building an app', date: 'Nov 21, 2011', excerpt: 'Everyone wants an app. Nobody opens it.' },
  ],
  comments: SOCIAL_COMMENTS,
  forumThreads: [
    '[STICKY] Read this before posting!!',
    'Post your phone’s home screen',
    'Is Flash dead? (poll)',
    'Rails or Node? (12 pages)',
    'When is the app coming out?',
    'My account got hacked :(',
    'Introduce yourself here',
    'Retina screens: worth it?',
  ],
  activity: SOCIAL_ACTIVITY,
  photoNames: ['IMG_0423.JPG', 'brunch.jpg', 'sunset_vintage.jpg', 'cat.jpg', 'beach_filtered.jpg', 'concert_blurry.jpg', 'mirror_selfie.jpg', 'IMG_0424.JPG'],
  videos: ['cat_vs_printer.mp4', 'unboxing_my_new_phone.mp4', 'double_rainbow_reaction.mp4'],
};

const PLATFORM_CONTENT: SiteContent = {
  blogPosts: [
    { title: 'Why we rewrote the frontend', date: 'Mar 5, 2018', excerpt: 'Same page, two megabytes of JavaScript, a much better developer experience.' },
    { title: 'Our privacy update', date: 'May 24, 2018', excerpt: 'We value your privacy. Please accept all cookies to keep reading.' },
    { title: 'Scaling to a billion visitors on Kubernetes', date: 'Jul 9, 2018', excerpt: 'Four engineers and one YAML file, 3,000 lines long.' },
    { title: 'We’re hiring!', date: 'Sep 12, 2018', excerpt: 'Rockstar ninja engineers wanted. Ping-pong table included.' },
    { title: 'Our incredible growth story', date: 'Nov 1, 2018', excerpt: 'Up and to the right. The chart has no labels.' },
  ],
  comments: SOCIAL_COMMENTS,
  forumThreads: WEB2_FORUM,
  activity: [
    'jess.codes started a free trial',
    'priya upgraded to Pro',
    'dev_dan starred your repo',
    'anna.k turned on notifications (by accident)',
    'growth_guru shared your launch post',
    'leo invited 3 teammates',
    'nina cancelled. We’re sorry to see you go!',
  ],
  photoNames: ['team_offsite.jpg', 'standing_desk.jpg', 'latte_art.jpg', 'launch_party.jpg', 'office_dog.jpg', 'whiteboard.jpg', 'hackathon.jpg', 'IMG_20180612.jpg'],
  videos: ['our_product_in_60_seconds.mp4', 'unboxing_my_new_phone.mp4', 'conference_keynote.mp4'],
};

const AI_CONTENT: SiteContent = {
  blogPosts: [
    { title: 'Introducing our AI', date: 'Jan 10, 2024', excerpt: 'It’s in everything now. You can’t turn it off, but you can rename it.' },
    { title: 'We’re now an AI-first company', date: 'Mar 4, 2024', excerpt: 'Same product. New pitch deck.' },
    { title: 'How we cut our GPU bill in half', date: 'May 20, 2024', excerpt: 'We switched off the AI that summarized our other AI.' },
    { title: 'Why our chatbot offered you a refund', date: 'Aug 2, 2024', excerpt: 'An honest post-mortem, written by a human. Mostly.' },
    { title: 'Dark mode is finally here', date: 'Oct 15, 2024', excerpt: 'You asked. Five years ago. Here it is.' },
  ],
  comments: SOCIAL_COMMENTS,
  forumThreads: WEB2_FORUM,
  activity: [
    'An agent signed up on someone’s behalf',
    'prompt_queen generated 40 images',
    'Your AI replied to 300 messages',
    'anna.k asked to talk to a human',
    'A crawler read every page (again)',
    'dev_dan forked your prompt',
    'Grandma Rose asked the AI to call her grandson',
  ],
  photoNames: ['cat_astronaut.png', 'PXL_20240611.jpg', 'team_generated.png', 'sunset_upscaled.png', 'six_fingers.png', 'pet_portrait.png', 'vacation_enhanced.jpg', 'screenshot.png'],
  videos: ['ai_trailer_v3_final.mp4', 'this_video_is_not_real.mp4', 'unboxing_my_new_phone.mp4'],
};

export const SITE_CONTENT: Readonly<Record<EraId, SiteContent>> = {
  'homepage-1997': WEB2_CONTENT,
  'web2-2005': WEB2_CONTENT,
  'social-2011': SOCIAL_CONTENT,
  'platform-2018': PLATFORM_CONTENT,
  'ai-2024': AI_CONTENT,
};
