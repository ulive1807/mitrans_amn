/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Publishable key Clerk (pk_test_… / pk_live_…). Aman untuk peramban. JANGAN isi secret key di sini. */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
}
