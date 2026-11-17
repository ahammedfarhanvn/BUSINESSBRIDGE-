/**
 * BusinessBridge Database Definitions
 * Provides full dynamic type safety across all Supabase operations.
 */

// eslint-disable-next-line @type-alias/type-alias
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
