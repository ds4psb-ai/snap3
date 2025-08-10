-- Create separate schema for exports worktree
CREATE SCHEMA IF NOT EXISTS exports;

-- Set search path to include exports schema
ALTER DATABASE postgres SET search_path TO public, exports;

-- Create exports-specific tables in exports schema
CREATE TABLE IF NOT EXISTS exports.brief_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  digest_id VARCHAR(8) NOT NULL,
  title TEXT NOT NULL,
  scenes JSONB NOT NULL,
  evidence_pack JSONB NOT NULL,
  exported_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  workspace VARCHAR(50) DEFAULT 'feature-exports'
);

CREATE TABLE IF NOT EXISTS exports.json_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  digest_id VARCHAR(8) NOT NULL,
  video_gen_ir JSONB NOT NULL,
  veo3_prompt JSONB NOT NULL,
  evidence_pack JSONB NOT NULL,
  exported_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  workspace VARCHAR(50) DEFAULT 'feature-exports'
);

-- Create indexes for better performance
CREATE INDEX idx_brief_exports_digest ON exports.brief_exports(digest_id);
CREATE INDEX idx_json_exports_digest ON exports.json_exports(digest_id);
CREATE INDEX idx_brief_exports_workspace ON exports.brief_exports(workspace);
CREATE INDEX idx_json_exports_workspace ON exports.json_exports(workspace);

-- Row Level Security
ALTER TABLE exports.brief_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports.json_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace isolation
CREATE POLICY "Workspace isolation for brief_exports" ON exports.brief_exports
  FOR ALL USING (workspace = current_setting('app.workspace', true)::text OR current_setting('app.workspace', true) IS NULL);

CREATE POLICY "Workspace isolation for json_exports" ON exports.json_exports
  FOR ALL USING (workspace = current_setting('app.workspace', true)::text OR current_setting('app.workspace', true) IS NULL);