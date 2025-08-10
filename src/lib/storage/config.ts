import { createClient } from '@supabase/supabase-js';

// Workspace-specific storage configuration
const WORKSPACE = process.env.STORAGE_WORKSPACE || 'feature-exports';
const BUCKET_PREFIX = process.env.STORAGE_BUCKET_PREFIX || 'exports/';

export const storageConfig = {
  workspace: WORKSPACE,
  buckets: {
    briefs: `${BUCKET_PREFIX}briefs`,
    json: `${BUCKET_PREFIX}json`,
    media: `${BUCKET_PREFIX}media`,
    temp: `${BUCKET_PREFIX}temp`,
  },
  // Add workspace prefix to all storage paths
  getPath: (bucket: string, filename: string) => {
    return `${WORKSPACE}/${bucket}/${filename}`;
  },
};

// Create Supabase client with workspace context
export function createSupabaseClient() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    {
      db: {
        schema: 'exports', // Use exports schema
      },
      global: {
        headers: {
          'x-workspace': WORKSPACE,
        },
      },
    }
  );
  
  // Set workspace for RLS
  supabase.rpc('set_config', {
    setting: 'app.workspace',
    value: WORKSPACE,
  });
  
  return supabase;
}