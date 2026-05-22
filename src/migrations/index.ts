import * as migration_20260521_154054_initial_cms_ai from './20260521_154054_initial_cms_ai';
import * as migration_20260522_083600_media_embedded_image_fallback from './20260522_083600_media_embedded_image_fallback';
import * as migration_20260522_092600_media_external_image_url from './20260522_092600_media_external_image_url';

export const migrations = [
  {
    up: migration_20260521_154054_initial_cms_ai.up,
    down: migration_20260521_154054_initial_cms_ai.down,
    name: '20260521_154054_initial_cms_ai'
  },
  {
    up: migration_20260522_083600_media_embedded_image_fallback.up,
    down: migration_20260522_083600_media_embedded_image_fallback.down,
    name: '20260522_083600_media_embedded_image_fallback'
  },
  {
    up: migration_20260522_092600_media_external_image_url.up,
    down: migration_20260522_092600_media_external_image_url.down,
    name: '20260522_092600_media_external_image_url'
  },
];
