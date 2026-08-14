import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Shared, framework-agnostic backend logic for Iroko.
// Imported by both the long-running Express server (server.ts) and the
// Vercel serverless functions (api/*) so the prompt/extraction logic has
// a single source of truth.

export interface AuthUser {
  id: string;
  email?: string;
}

// ---------- Supabase service client (server-side, bypasses RLS) ----------
let _supabase: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    _supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _supabase;
}

// ---------- Groq client (OpenAI-compatible chat completions) ----------
//
// Uses Groq's ultra-fast LPU inference via the OpenAI-compatible REST endpoint.
// We call it with fetch (no extra SDK dependency). GROQ_API_KEY is server-side
// only. Primary model: llama-3.3-70b-versatile; fallback: llama-3.1-8b-instant.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

interface GroqOptions {
  systemInstruction?: string;
  prompt: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

async function groqComplete(opts: GroqOptions): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured.');
  const messages = [
    ...(opts.systemInstruction ? [{ role: 'system' as const, content: opts.systemInstruction }] : []),
    { role: 'user' as const, content: opts.prompt },
  ];
  let lastError: any = null;
  // Retry transient rate-limit / overload errors with exponential backoff.
  const MAX_RETRIES = 3;
  for (const model of GROQ_MODELS) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const body: any = {
          model,
          messages,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens ?? 8192,
        };
        if (opts.jsonMode) body.response_format = { type: 'json_object' };
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        // Retry on rate-limit (429) and transient overload (503/529).
        const retryable = res.status === 429 || res.status === 503 || res.status === 529;
        if (retryable && attempt < MAX_RETRIES) {
          const retryAfter = Number(res.headers.get('retry-after')) || (1.5 * (attempt + 1));
          lastError = new Error(`Groq ${model} HTTP ${res.status} (retry ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }
        if (!res.ok) {
          const errText = await res.text();
          lastError = new Error(`Groq ${model} HTTP ${res.status}: ${errText.slice(0, 200)}`);
          break; // non-retryable error for this model; try next model
        }
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return { text, model };
        lastError = new Error(`Groq ${model} returned empty content.`);
      } catch (err: any) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1.5 * (attempt + 1) * 1000));
          continue;
        }
      }
    }
  }
  throw lastError || new Error('All Groq model attempts failed.');
}

// Robustly parse JSON from an LLM response that may wrap it in markdown
// fences or prepend/append prose. Extracts the outermost JSON object.
function parseJsonLoose(raw: string): any {
  if (!raw) return {};
  let s = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // Fallback: slice from first '{' to last '}'.
  if (!s.startsWith('{')) {
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);
  }
  return JSON.parse(s);
}

// ---------- Auth ----------
// Verifies a Supabase access token and returns the user, or null.
export async function verifyAuth(authHeader: string): Promise<AuthUser | null> {
  try {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return null;
    const { data, error } = await getSupabase().auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email };
  } catch {
    return null;
  }
}

// ---------- Heuristic fallbacks ----------
export function extractFallbackEntities(rawText: string): any[] {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: any[] = [];
  let id = 1;

  for (const line of lines) {
    const cleanLine = line.replace(/^(User:|AI:|Human:|Assistant:|\*|-|\d+\.)\s*/i, '').trim();
    if (!cleanLine || cleanLine.length < 8) continue;

    if (cleanLine.includes('%') || /\b\d+(\.\d+)?%\b/.test(cleanLine)) {
      results.push({ id: id++, category: 'PROGRESS METRIC', verbatimText: cleanLine, score: 98, level: 'strong', note: 'Direct quantitative indicator' });
    } else if (/latency|issue|error|fail|bug|cluster|database|pending|delay|trouble|calibration/i.test(cleanLine)) {
      results.push({ id: id++, category: 'ISSUE RESOLUTION', verbatimText: cleanLine, score: 82, level: 'partial', note: 'Describes technical condition or resolution' });
    } else if (/friday|monday|tuesday|wednesday|thursday|saturday|sunday|q[1-4]|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|deadline|timeline|date|schedule/i.test(cleanLine)) {
      results.push({ id: id++, category: 'TARGET DEADLINE', verbatimText: cleanLine, score: 94, level: 'strong', note: 'Explicit milestone timeline' });
    } else if (/voted|selected|approved|concluded|decided|contract|license/i.test(cleanLine)) {
      results.push({ id: id++, category: 'DECISION', verbatimText: cleanLine, score: 95, level: 'strong', note: 'Formal decision outcome' });
    } else if (/\$|revenue|cost|budget|surplus|profit|price/i.test(cleanLine)) {
      results.push({ id: id++, category: 'FINANCIAL METRIC', verbatimText: cleanLine, score: 96, level: 'strong', note: 'Quantitative financial value' });
    }
  }

  if (results.length === 0) {
    const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [rawText];
    sentences.slice(0, 3).forEach((s, idx) => {
      const trimmed = s.trim();
      if (trimmed.length > 5) {
        results.push({
          id: id++,
          category: idx === 0 ? 'KEY FACT' : idx === 1 ? 'FINDING' : 'ACTION ITEM',
          verbatimText: trimmed,
          score: idx === 0 ? 94 : idx === 1 ? 82 : 71,
          level: idx === 0 ? 'strong' : idx === 1 ? 'partial' : 'weak',
          note: 'Verbatim excerpt from source document',
        });
      }
    });
  }
  return results;
}

export function localCompile(quotes: any[], docTitle: string, format: string): string {
  if (format === 'flow') {
    return `# ${docTitle}\n\n` + quotes.map((q) => q.verbatimText).join(' ');
  }
  if (format === 'markdown') {
    return (
      `# ${docTitle}\n\n*Generated: ${new Date().toLocaleDateString()}*\n\n` +
      quotes
        .map((q, i) => `### ${i + 1}. [${q.category || 'QUOTE'}]\n> "${q.verbatimText}"\n\n*Confidence: ${q.score || 90}%${q.note ? ` | Context: ${q.note}` : ''}*`)
        .join('\n\n---\n\n')
    );
  }
  const grouped: { [key: string]: any[] } = {};
  quotes.forEach((q) => {
    const cat = q.category || 'GENERAL';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(q);
  });
  let out = `# ${docTitle}\n\n`;
  for (const [cat, items] of Object.entries(grouped)) {
    out += `## ${cat}\n\n`;
    items.forEach((item) => {
      out += `- "${item.verbatimText}"\n`;
    });
    out += '\n';
  }
  return out;
}

export function localChunkAction(chunks: any[], instruction: string): string {
  const text = chunks.map((c) => c.verbatimText || c.verbatim_text || '').join('\n\n');
  const lower = instruction.toLowerCase();
  if (lower.includes('list') || lower.includes('bullet')) {
    return chunks.map((c) => `- ${c.verbatimText || c.verbatim_text}`).join('\n');
  }
  if (lower.includes('count') || lower.includes('how many')) {
    return `There are ${chunks.length} chunk(s) in the selection.`;
  }
  if (lower.includes('categor') || lower.includes('group')) {
    const grouped: { [k: string]: any[] } = {};
    chunks.forEach((c) => { const k = c.category || 'GENERAL'; (grouped[k] = grouped[k] || []).push(c); });
    let out = '';
    for (const [cat, items] of Object.entries(grouped)) {
      out += `## ${cat}\n` + items.map((c) => `- ${c.verbatimText || c.verbatim_text}`).join('\n') + '\n\n';
    }
    return out.trim();
  }
  return `### Instruction\n${instruction}\n\n### Selected chunks\n${text}`;
}

// ---------- Extract ----------
export async function runExtraction(user: AuthUser, body: { text?: string; criteria?: string; label?: string }) {
  const { text, criteria, label } = body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { status: 400, json: { error: 'Text is required for extraction.' } };
  }

  const title = label || 'Untitled Extraction';
  const supabase = getSupabase();

  let entities: any[] = [];
  let modelUsed = 'heuristic-local-fallback';
  let warning: string | undefined;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    entities = extractFallbackEntities(text);
    warning = 'Live AI model was temporarily unavailable. Deterministic verbatim extraction applied.';
  } else {
    const prompt = `You are Iroko, a high-precision verbatim entity and factual extraction engine.
CRITICAL MANDATE:
Extract exact, word-for-word verbatim factual chunks from the source text below.
DO NOT summarize, DO NOT reword, DO NOT paraphrase, DO NOT hallucinate.
Preserve the exact phrases, numbers, percentages, dates, status reports, bug reports, and decisions from the text.

Instructions/Criteria to focus on: ${criteria || 'Key factual updates, status, infrastructure issues, timelines, decisions, actions, metrics'}

Source Text:
"""
${text}
"""

Return a JSON object with a single key "entities" containing a JSON array of extracted entities. Each entity must have:
- category: A concise uppercase category name (e.g. "PROGRESS METRIC", "ISSUE RESOLUTION", "TARGET DEADLINE", "DECISION", "ACTION ITEM", "TECHNICAL SPEC", "FINANCIAL FIGURE")
- verbatimText: The exact substring quote from the text (MUST be word-for-word exact from the text)
- score: Confidence score integer from 50 to 99 representing how directly verifiable and high-fidelity the chunk is
- level: "strong" if score >= 85, "partial" if score is between 60 and 84, "weak" if score < 60
- note: Brief technical note or context (e.g. "Direct quantitative progress indicator" or "Explicit milestone timeline")

Output ONLY the JSON object, no prose. Example shape:
{"entities":[{"category":"PROGRESS METRIC","verbatimText":"...","score":90,"level":"strong","note":"..."}]}`;

    try {
      const { text: raw, model } = await groqComplete({
        systemInstruction: 'You are Iroko Verbatim Extractor. You extract exact verbatim text chunks from source documents without rewriting. Return only valid JSON.',
        prompt,
        jsonMode: true,
        temperature: 0.1,
      });
      modelUsed = model;
      const parsed = parseJsonLoose(raw);
      entities = Array.isArray(parsed) ? parsed : (parsed.entities || parsed.array || []);
      if (entities.length === 0) {
        // Model returned valid JSON but no entities — treat as failure rather
        // than silently substituting misleading keyword-matched chunks.
        return {
          status: 503,
          json: {
            error:
              'The AI model could not extract verbatim chunks from this input. Please try again in a moment, or refine your text/criteria. (No fabricated fallback was used.)',
          },
        };
      }
    } catch (err: any) {
      console.error('Groq extraction error:', err?.message || err);
      // Do NOT fall back to the keyword heuristic — it produces misleading
      // (wrong) categories for non-technical text. Surface a clear retry error.
      return {
        status: 503,
        json: {
          error:
            'The AI service is temporarily busy (rate limit). Please wait a few seconds and try again. No fabricated fallback was used to avoid showing incorrect information.',
        },
      };
    }
  }

  entities = entities.map((item: any) => ({
    category: (item.category || 'FACT').toUpperCase(),
    verbatimText: item.verbatimText || '',
    score: typeof item.score === 'number' ? item.score : 85,
    level: item.level || (item.score >= 85 ? 'strong' : item.score >= 60 ? 'partial' : 'weak'),
    note: item.note || '',
  }));

  const recordRow = {
    user_id: user.id,
    title,
    raw_input: text,
    extracted_at: new Date().toISOString(),
    character_count: text.length,
    volume: entities.length,
    status: 'completed',
  };

  const { data: record, error: recErr } = await supabase
    .from('extraction_records')
    .insert(recordRow)
    .select()
    .single();

  // If DB persistence is unavailable (e.g. schema not yet applied), degrade
  // gracefully: return the extracted entities to the client with a warning
  // instead of failing the whole request, so the app stays usable.
  if (recErr) {
    const persistWarn = `Extraction succeeded but could not be saved (database error: ${recErr.message}). Run supabase/schema.sql to enable persistence.`;
    return {
      status: 200,
      json: {
        record: {
          id: `temp_${Date.now()}`,
          title,
          rawInput: text,
          extractedAt: recordRow.extracted_at,
          characterCount: recordRow.character_count,
          volume: recordRow.volume,
          status: 'completed',
          entities,
        },
        modelUsed,
        warning: warning ? `${warning} ${persistWarn}` : persistWarn,
        meta: {
          characterCount: text.length,
          count: entities.length,
          extractedAt: recordRow.extracted_at,
        },
      },
    };
  }

  const chunkRows = entities.map((e: any) => ({
    record_id: record.id,
    category: e.category,
    verbatim_text: e.verbatimText,
    score: e.score,
    level: e.level,
    note: e.note,
  }));

  let persistedChunks: any[] = [];
  if (chunkRows.length > 0) {
    const { data: insertedChunks, error: chunkErr } = await supabase
      .from('extracted_chunks')
      .insert(chunkRows)
      .select();
    if (chunkErr) {
      // Record saved but chunks failed — still return the record + unsaved entities.
      const chunkWarn = `Saved record but could not save chunks (${chunkErr.message}).`;
      return {
        status: 200,
        json: {
          record: {
            id: record.id,
            title: record.title,
            rawInput: record.raw_input,
            extractedAt: record.extracted_at,
            characterCount: record.character_count,
            volume: record.volume,
            status: record.status,
            entities,
          },
          modelUsed,
          warning: warning ? `${warning} ${chunkWarn}` : chunkWarn,
          meta: {
            characterCount: text.length,
            count: entities.length,
            extractedAt: record.extracted_at,
          },
        },
      };
    }
    persistedChunks = insertedChunks || [];
  }

  return {
    status: 200,
    json: {
      record: {
        id: record.id,
        title: record.title,
        rawInput: record.raw_input,
        extractedAt: record.extracted_at,
        characterCount: record.character_count,
        volume: record.volume,
        status: record.status,
        entities: persistedChunks.map((c: any) => ({
          id: c.id,
          category: c.category,
          verbatimText: c.verbatim_text,
          score: c.score,
          level: c.level,
          note: c.note || '',
        })),
      },
      modelUsed,
      warning,
      meta: {
        characterCount: text.length,
        count: entities.length,
        extractedAt: record.extracted_at,
      },
    },
  };
}

// ---------- Compile document ----------
export async function runCompileDocument(user: AuthUser, body: { quotes?: any[]; title?: string; format?: string }) {
  const { quotes, title, format = 'categorized' } = body;
  if (!quotes || !Array.isArray(quotes) || quotes.length === 0) {
    return { status: 400, json: { error: 'Quotes array is required.' } };
  }

  const docTitle = title || 'Verbatim Quotes Compilation';
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    const compiledDoc = localCompile(quotes, docTitle, format);
    return { status: 200, json: { compiledText: compiledDoc.trim(), quotesCount: quotes.length, modelUsed: 'local-compiler' } };
  }

  try {
    const quotesList = quotes.map((q: any, idx: number) => `[Quote ${idx + 1} | ${q.category}]: "${q.verbatimText}"`).join('\n');
    const prompt = `You are a precision verbatim document compiler.
YOUR ABSOLUTE MANDATE:
Combine the provided quotes into a cohesive, structured document.
STRICT RULES:
1. Every single quote MUST remain 100% WORD-FOR-WORD EXACT.
2. DO NOT summarize, DO NOT paraphrase, DO NOT rewrite, and DO NOT edit any quote's words.
3. You may organize them with logical section headings, category titles, and clean bulleted or blockquote layout.
4. Do not invent new facts. Maintain pure fidelity to the quotes provided.

Document Title: ${docTitle}
Desired Layout Style: ${format}

Quotes to compile:
"""
${quotesList}
"""

Output the compiled document in clean Markdown formatting.`;

    const { text, model } = await groqComplete({
      systemInstruction: 'You compile verbatim quotes into structured Markdown documents without changing or summarizing a single word.',
      prompt,
      temperature: 0.3,
    });

    return {
      status: 200,
      json: {
        compiledText: text.trim() || quotes.map((q: any) => q.verbatimText).join('\n\n'),
        quotesCount: quotes.length,
        modelUsed: model,
      },
    };
  } catch (err: any) {
    console.error('Document compilation error:', err);
    return {
      status: 200,
      json: {
        compiledText: `# ${docTitle}\n\n` + quotes.map((q: any) => `- "${q.verbatimText}"`).join('\n'),
        quotesCount: quotes.length,
        modelUsed: 'fallback',
      },
    };
  }
}

// ---------- Chunk action ----------
export async function runChunkAction(
  user: AuthUser,
  body: { chunkIds?: string[]; chunks?: any[]; instruction?: string; allChunksContext?: string }
) {
  const { chunkIds, chunks, instruction, allChunksContext } = body;
  if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
    return { status: 400, json: { error: 'An instruction is required.' } };
  }

  const supabase = getSupabase();
  let targetChunks: any[] = Array.isArray(chunks) && chunks.length > 0 ? chunks : [];

  if (targetChunks.length === 0 && Array.isArray(chunkIds) && chunkIds.length > 0) {
    const { data, error } = await supabase
      .from('extracted_chunks')
      .select('*, extraction_records!inner(user_id)')
      .in('id', chunkIds);
    if (error) throw new Error(`Fetch chunks failed: ${error.message}`);
    targetChunks = (data || []).filter((c: any) => c.extraction_records?.user_id === user.id);
  }

  if (targetChunks.length === 0) {
    return { status: 400, json: { error: 'No chunks provided to act on.' } };
  }

  const apiKey = process.env.GROQ_API_KEY;
  const chunkList = targetChunks
    .map((c: any, idx: number) => `[Chunk ${idx + 1} | ${c.category || 'QUOTE'}]: "${c.verbatimText || c.verbatim_text}"${c.note ? ` (context: ${c.note})` : ''}`)
    .join('\n');

  const prompt = `You are Iroko, a precision assistant that operates on exact verbatim text chunks.
ABSOLUTE RULES:
1. Treat the provided chunks as immutable source truth — never fabricate content that the chunks do not support.
2. Follow the user's instruction precisely to transform, derive, analyze, or reorganize the chunks.
3. If the instruction asks to summarize, you may summarize ONLY the provided chunks. If it asks to keep verbatim, keep every word exact.
4. If the instruction is impossible or unsafe, respond with a short explanation instead.

Provided chunks:
"""
${chunkList}
"""

${allChunksContext ? `Broader document context (other chunks from the same source):\n"""\n${allChunksContext}\n"""\n` : ''}

User instruction:
"""
${instruction}
"""

Respond with the result. Prefer clean Markdown.`;

  let resultText: string;
  let modelUsed = 'heuristic-local-fallback';

  if (!apiKey) {
    resultText = localChunkAction(targetChunks, instruction);
  } else {
    try {
      const { text, model } = await groqComplete({
        systemInstruction: 'You act on exact verbatim chunks per the user instruction, never fabricating unsupported facts.',
        prompt,
        temperature: 0.3,
      });
      resultText = text.trim();
      modelUsed = model;
    } catch (err: any) {
      console.warn('Chunk action Groq error:', err?.message);
      resultText = localChunkAction(targetChunks, instruction);
    }
  }

  return {
    status: 200,
    json: {
      result: resultText,
      modelUsed,
      chunkCount: targetChunks.length,
    },
  };
}
