import type { EraId } from '../types';

/**
 * Every era in order, half-eras included: which of them a run plays is in era-chain.ts. Its own module, so content
 * that names features per era can read it without importing eras.ts.
 */
export const ERA_IDS: readonly EraId[] = ['homepage-1997', 'crash-2000', 'web2-2005', 'social-2011', 'platform-2018', 'ai-2024'];
