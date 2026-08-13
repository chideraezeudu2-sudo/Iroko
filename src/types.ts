export type PageView = 'landing' | 'extract' | 'history' | 'settings' | 'terms' | 'privacy';

export type ConfidenceLevel = 'strong' | 'partial' | 'weak';

export interface ExtractedChunk {
  id: string;
  category: string;
  verbatimText: string;
  score: number; // 0 - 100
  level: ConfidenceLevel;
  note?: string;
  sourceRange?: { start: number; end: number };
}

export interface ExtractionRecord {
  id: string;
  title: string;
  rawInput: string;
  extractedAt: string;
  characterCount: number;
  entities: ExtractedChunk[];
  volume: number;
  status: 'completed' | 'processing' | 'failed';
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: string;
  plan: 'free' | 'pro' | 'enterprise';
  confidenceThresholdHideWeak: boolean;
  autoSaveHistory: boolean;
  modelStrictness: 'exact' | 'strict' | 'relaxed';
}

// Raw row shapes matching the public Postgres tables (snake_case).
export interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  plan: 'free' | 'pro' | 'enterprise';
  confidence_threshold_hide_weak: boolean;
  auto_save_history: boolean;
  model_strictness: 'exact' | 'strict' | 'relaxed';
  created_at: string;
}

export interface ExtractionRecordRow {
  id: string;
  user_id: string;
  title: string;
  raw_input: string;
  extracted_at: string;
  character_count: number;
  volume: number;
  status: 'completed' | 'processing' | 'failed';
  created_at: string;
}

export interface ExtractedChunkRow {
  id: string;
  record_id: string;
  category: string;
  verbatim_text: string;
  score: number;
  level: ConfidenceLevel;
  note: string;
  source_range_start: number | null;
  source_range_end: number | null;
}
