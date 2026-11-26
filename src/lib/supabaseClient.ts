import { createClient, SupabaseClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.includes('YOUR_PROJECT_ID')) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
    return parsed.origin;
  } catch {
    return trimmed.replace(/\/rest\/v1\/?.*$/i, '').replace(/\/+$/, '');
  }
}

const supabaseUrl = normalizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL as string | undefined
);
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      rawAnonKey &&
      !supabaseUrl.includes('YOUR_PROJECT_ID') &&
      !rawAnonKey.includes('YOUR_SUPABASE_ANON_KEY') &&
      !rawAnonKey.includes('COLE_')
  );
}

export function getSupabaseProjectHost(): string | null {
  if (!supabaseUrl) return null;
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return null;
  }
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, rawAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
