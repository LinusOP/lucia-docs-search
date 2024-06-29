/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MEILI_URL: string;
  readonly PUBLIC_MEILI_INDEX_UID: string;
  readonly PUBLIC_MEILI_SEARCH_API_KEY: string;
  readonly MEILI_ADMIN_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
