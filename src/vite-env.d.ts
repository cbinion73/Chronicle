/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BIBLE_PROVIDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
