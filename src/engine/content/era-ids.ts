import type { EraId } from '../types';

/** The eras in order. Its own module, so content that names features per era can read it without importing eras.ts. */
export const ERA_IDS: readonly EraId[] = ['homepage-1997', 'web2-2005', 'social-2011', 'platform-2018', 'ai-2024'];
