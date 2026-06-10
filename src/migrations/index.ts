import * as migration_20260521_154054_initial_cms_ai from './20260521_154054_initial_cms_ai';
import * as migration_20260522_083600_media_embedded_image_fallback from './20260522_083600_media_embedded_image_fallback';
import * as migration_20260522_092600_media_external_image_url from './20260522_092600_media_external_image_url';
import * as migration_20260525_214800_content_evolution from './20260525_214800_content_evolution';
import * as migration_20260525_221200_content_evolution_uuid from './20260525_221200_content_evolution_uuid';
import * as migration_20260529_062900_media_google_drive_storage from './20260529_062900_media_google_drive_storage';
import * as migration_20260529_073000_article_translation_groups from './20260529_073000_article_translation_groups';
import * as migration_20260603_083000_expand_article_languages from './20260603_083000_expand_article_languages';
import * as migration_20260603_101500_article_legacy_source from './20260603_101500_article_legacy_source';
import * as migration_20260603_115000_article_legacy_source_payload_names from './20260603_115000_article_legacy_source_payload_names';
import * as migration_20260610_091500_article_review_status_and_seo_overrides from './20260610_091500_article_review_status_and_seo_overrides';

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
  {
    up: migration_20260529_073000_article_translation_groups.up,
    down: migration_20260529_073000_article_translation_groups.down,
    name: '20260529_073000_article_translation_groups'
  },
  {
    up: migration_20260603_083000_expand_article_languages.up,
    down: migration_20260603_083000_expand_article_languages.down,
    name: '20260603_083000_expand_article_languages'
  },
  {
    up: migration_20260603_101500_article_legacy_source.up,
    down: migration_20260603_101500_article_legacy_source.down,
    name: '20260603_101500_article_legacy_source'
  },
  {
    up: migration_20260603_115000_article_legacy_source_payload_names.up,
    down: migration_20260603_115000_article_legacy_source_payload_names.down,
    name: '20260603_115000_article_legacy_source_payload_names'
  },
  {
    up: migration_20260610_091500_article_review_status_and_seo_overrides.up,
    down: migration_20260610_091500_article_review_status_and_seo_overrides.down,
    name: '20260610_091500_article_review_status_and_seo_overrides'
  },
];
