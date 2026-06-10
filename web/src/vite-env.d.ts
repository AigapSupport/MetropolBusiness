/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API kök adresi (örn. http://localhost:5000/api/v1). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
