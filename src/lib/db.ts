import { supabase } from './supabase';
import {
  ExtractionRecord,
  ExtractedChunk,
  UserProfile,
  ExtractionRecordRow,
  ExtractedChunkRow,
  UserRow,
} from '../types';

// ---------- Profile ----------

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToProfile(data as UserRow);
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<UserProfile, 'confidenceThresholdHideWeak' | 'autoSaveHistory' | 'modelStrictness' | 'name' | 'avatarUrl'>>,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.confidenceThresholdHideWeak !== undefined) update.confidence_threshold_hide_weak = patch.confidenceThresholdHideWeak;
  if (patch.autoSaveHistory !== undefined) update.auto_save_history = patch.autoSaveHistory;
  if (patch.modelStrictness !== undefined) update.model_strictness = patch.modelStrictness;
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.avatarUrl !== undefined) update.avatar_url = patch.avatarUrl;
  if (Object.keys(update).length === 0) return;

  const { error } = await supabase.from('users').update(update).eq('id', userId);
  if (error) throw error;
}

export function rowToProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name || '',
    avatarUrl: row.avatar_url || '',
    role: 'Researcher',
    plan: row.plan,
    confidenceThresholdHideWeak: row.confidence_threshold_hide_weak,
    autoSaveHistory: row.auto_save_history,
    modelStrictness: row.model_strictness,
  };
}

// ---------- Records & chunks ----------

export async function fetchRecords(): Promise<ExtractionRecord[]> {
  const { data: records, error } = await supabase
    .from('extraction_records')
    .select('*')
    .order('extracted_at', { ascending: false });
  if (error) throw error;
  if (!records || records.length === 0) return [];

  const recordIds = (records as ExtractionRecordRow[]).map((r) => r.id);
  const { data: chunks, error: chunkErr } = await supabase
    .from('extracted_chunks')
    .select('*')
    .in('record_id', recordIds);
  if (chunkErr) throw chunkErr;

  const chunksByRecord = new Map<string, ExtractedChunk[]>();
  for (const c of (chunks as ExtractedChunkRow[]) || []) {
    const list = chunksByRecord.get(c.record_id) || [];
    list.push(rowToChunk(c));
    chunksByRecord.set(c.record_id, list);
  }

  return (records as ExtractionRecordRow[]).map((r) => rowToRecord(r, chunksByRecord.get(r.id) || []));
}

export async function saveRecord(record: ExtractionRecord, userId: string): Promise<ExtractionRecord> {
  // Upsert record row (existing id replaced).
  const recordRow: Partial<ExtractionRecordRow> = {
    id: record.id,
    user_id: userId,
    title: record.title,
    raw_input: record.rawInput,
    extracted_at: record.extractedAt,
    character_count: record.characterCount,
    volume: record.volume,
    status: record.status,
  };

  const { data: existing } = await supabase
    .from('extraction_records')
    .select('id')
    .eq('id', record.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('extraction_records').update(recordRow).eq('id', record.id);
    if (error) throw error;
    // Replace chunks: delete old, insert new.
    const { error: delErr } = await supabase.from('extracted_chunks').delete().eq('record_id', record.id);
    if (delErr) throw delErr;
  } else {
    const { error } = await supabase.from('extraction_records').insert(recordRow);
    if (error) throw error;
  }

  await insertChunks(record.id, record.entities);
  return record;
}

export async function deleteRecord(id: string): Promise<void> {
  // Chunks cascade-delete via FK on delete cascade.
  const { error } = await supabase.from('extraction_records').delete().eq('id', id);
  if (error) throw error;
}

export async function clearAllRecords(): Promise<void> {
  const { data, error } = await supabase.from('extraction_records').select('id');
  if (error) throw error;
  if (!data || data.length === 0) return;
  const ids = (data as { id: string }[]).map((r) => r.id);
  const { error: delErr } = await supabase.from('extraction_records').delete().in('id', ids);
  if (delErr) throw delErr;
}

// ---------- Mappers ----------

function rowToRecord(row: ExtractionRecordRow, chunks: ExtractedChunk[]): ExtractionRecord {
  return {
    id: row.id,
    title: row.title,
    rawInput: row.raw_input,
    extractedAt: row.extracted_at,
    characterCount: row.character_count,
    volume: row.volume,
    status: row.status,
    entities: chunks,
  };
}

function rowToChunk(row: ExtractedChunkRow): ExtractedChunk {
  return {
    id: row.id,
    category: row.category,
    verbatimText: row.verbatim_text,
    score: row.score,
    level: row.level,
    note: row.note || undefined,
    sourceRange:
      row.source_range_start != null && row.source_range_end != null
        ? { start: row.source_range_start, end: row.source_range_end }
        : undefined,
  };
}

async function insertChunks(recordId: string, chunks: ExtractedChunk[]): Promise<void> {
  if (chunks.length === 0) return;
  const rows: Partial<ExtractedChunkRow>[] = chunks.map((c) => ({
    record_id: recordId,
    category: c.category,
    verbatim_text: c.verbatimText,
    score: c.score,
    level: c.level,
    note: c.note || '',
    source_range_start: c.sourceRange?.start ?? null,
    source_range_end: c.sourceRange?.end ?? null,
  }));
  const { error } = await supabase.from('extracted_chunks').insert(rows);
  if (error) throw error;
}
