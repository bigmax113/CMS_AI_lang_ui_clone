import * as migration_20260521_154054_initial_cms_ai from './20260521_154054_initial_cms_ai';
import * as migration_20260522_083600_media_embedded_image_fallback from './20260522_083600_media_embedded_image_fallback';
import * as migration_20260522_092600_media_external_image_url from './20260522_092600_media_external_image_url';
import * as migration_20260525_214800_content_evolution from './20260525_214800_content_evolution';
import * as migration_20260525_221200_content_evolution_uuid from './20260525_221200_content_evolution_uuid';
import * as migration_20260529_062900_media_google_drive_storage from './20260529_062900_media_google_drive_storage';

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
  {
    up: migration_20260525_214800_content_evolution.up,
    down: migration_20260525_214800_content_evolution.down,
    name: '20260525_214800_content_evolution'
  },
  {
    up: migration_20260525_221200_content_evolution_uuid.up,
    down: migration_20260525_221200_content_evolution_uuid.down,
    name: '20260525_221200_content_evolution_uuid'
  },
  {
    up: migration_20260529_062900_media_google_drive_storage.up,
    down: migration_20260529_062900_media_google_drive_storage.down,
    name: '20260529_062900_media_google_drive_storage'
  },
];
