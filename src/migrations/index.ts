import * as migration_20260521_154054_initial_cms_ai from './20260521_154054_initial_cms_ai';

export const migrations = [
  {
    up: migration_20260521_154054_initial_cms_ai.up,
    down: migration_20260521_154054_initial_cms_ai.down,
    name: '20260521_154054_initial_cms_ai'
  },
];
