import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ---------- Supabase service client (server-side, bypasses RLS) ----------
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- Gemini client ----------
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return ai;
}

// ---------- Auth middleware ----------
// Requires a valid Supabase session JWT in the Authorization header.
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }
    (req as any).user = data.user;
    (req as any).accessToken = token;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Authentication failed.' });
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Health check (public)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', engine: 'Iroko Fact & Entity Extractor' });
  });

  // ---------- Extract API (auth + persist) ----------
  app.post('/api/extract', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { text, criteria, label } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Text is required for extraction.' });
      }

      const title = label || 'Untitled Extraction';

      // Run extraction (Gemini with heuristic fallback cascade).
      let entities: any[] = [];
      let modelUsed = 'heuristic-local-fallback';
      let warning: string | undefined;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        entities = extractFallbackEntities(text);
        warning = 'Live AI model was temporarily unavailable. Deterministic verbatim extraction applied.';
      } else {
        const client = getGeminiClient();
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

Return a JSON array of extracted entities. Each entity must have:
- category: A concise uppercase category name (e.g. "PROGRESS METRIC", "ISSUE RESOLUTION", "TARGET DEADLINE", "DECISION", "ACTION ITEM", "TECHNICAL SPEC", "FINANCIAL FIGURE")
- verbatimText: The exact substring quote from the text (MUST be word-for-word exact from the text)
- score: Confidence score integer from 50 to 99 representing how directly verifiable and high-fidelity the chunk is
- level: "strong" if score >= 85, "partial" if score is between 60 and 84, "weak" if score < 60
- note: Brief technical note or context (e.g. "Direct quantitative progress indicator" or "Explicit milestone timeline")`;

        const responseSchema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              verbatimText: { type: Type.STRING },
              score: { type: Type.INTEGER },
              level: { type: Type.STRING, enum: ['strong', 'partial', 'weak'] },
              note: { type: Type.STRING },
            },
            required: ['category', 'verbatimText', 'score', 'level'],
          },
        };

        const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest'];
        let response: any = null;
        let lastError: any = null;

        for (const currentModel of modelsToTry) {
          try {
            response = await client.models.generateContent({
              model: currentModel,
              contents: prompt,
              config: {
                systemInstruction: 'You are Iroko Verbatim Extractor. You extract exact verbatim text chunks from source documents without rewriting.',
                responseMimeType: 'application/json',
                responseSchema,
              },
            });
            if (response && response.text) {
              modelUsed = currentModel;
              break;
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`Model ${currentModel} error:`, err?.message || err);
          }
        }

        if (!response || !response.text) {
          throw lastError || new Error('All model attempts failed.');
        }

        try {
          entities = JSON.parse(response.text || '[]');
        } catch (parseError) {
          console.error('Failed to parse Gemini output:', response.text);
          entities = extractFallbackEntities(text);
          modelUsed = 'heuristic-local-fallback';
          warning = 'Live AI output could not be parsed. Deterministic verbatim extraction applied.';
        }
      }

      // Normalize entities.
      entities = entities.map((item: any, idx: number) => ({
        category: (item.category || 'FACT').toUpperCase(),
        verbatimText: item.verbatimText || '',
        score: typeof item.score === 'number' ? item.score : 85,
        level: item.level || (item.score >= 85 ? 'strong' : item.score >= 60 ? 'partial' : 'weak'),
        note: item.note || '',
      }));

      // Persist to the database (single source of truth).
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
      if (recErr) throw new Error(`Persist failed: ${recErr.message}`);

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
        if (chunkErr) throw new Error(`Persist chunks failed: ${chunkErr.message}`);
        persistedChunks = insertedChunks || [];
      }

      // Return the persisted record + chunks (with DB ids) to the client.
      res.json({
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
      });
    } catch (err: any) {
      console.error('Extraction error:', err);
      res.status(500).json({ error: err.message || 'Extraction failed.' });
    }
  });

  // ---------- Compile Verbatim Document API (auth) ----------
  app.post('/api/compile-document', requireAuth, async (req, res) => {
    try {
      const { quotes, title, format = 'categorized' } = req.body;
      if (!quotes || !Array.isArray(quotes) || quotes.length === 0) {
        return res.status(400).json({ error: 'Quotes array is required.' });
      }

      const docTitle = title || 'Verbatim Quotes Compilation';
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        const compiledDoc = localCompile(quotes, docTitle, format);
        return res.json({ compiledText: compiledDoc.trim(), quotesCount: quotes.length, modelUsed: 'local-compiler' });
      }

      const client = getGeminiClient();
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

      const modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-flash-lite'];
      let response: any = null;
      let modelUsed = 'gemini-3.7-flash';

      for (const currentModel of modelsToTry) {
        try {
          response = await client.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
              systemInstruction: 'You compile verbatim quotes into structured Markdown documents without changing or summarizing a single word.',
            },
          });
          if (response && response.text) {
            modelUsed = currentModel;
            break;
          }
        } catch (compileErr: any) {
          console.warn(`Document compilation with ${currentModel} failed:`, compileErr?.message);
        }
      }

      res.json({
        compiledText: response?.text?.trim() || quotes.map((q: any) => q.verbatimText).join('\n\n'),
        quotesCount: quotes.length,
        modelUsed,
      });
    } catch (err: any) {
      console.error('Document compilation error:', err);
      const quotes = req.body?.quotes || [];
      const title = req.body?.title || 'Verbatim Quotes';
      res.json({
        compiledText: `# ${title}\n\n` + quotes.map((q: any) => `- "${q.verbatimText}"`).join('\n'),
        quotesCount: quotes.length,
        modelUsed: 'fallback',
      });
    }
  });

  // ---------- Chunk Action API (NEW: per-chunk / bulk free-text instructions) ----------
  // Accepts { chunkIds?, chunks?, instruction, allChunksContext } and returns a
  // Gemini-derived/modified result driven by the user's free-text instruction.
  app.post('/api/chunk-action', requireAuth, async (req, res) => {
    try {
      const { chunkIds, chunks, instruction, allChunksContext } = req.body;
      if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
        return res.status(400).json({ error: 'An instruction is required.' });
      }

      // Resolve the chunk(s) to act on. Caller may pass full chunk objects
      // (preferred) or chunk ids (server resolves from DB, owner-scoped).
      let targetChunks: any[] = Array.isArray(chunks) && chunks.length > 0 ? chunks : [];

      if (targetChunks.length === 0 && Array.isArray(chunkIds) && chunkIds.length > 0) {
        const { data, error } = await supabase
          .from('extracted_chunks')
          .select('*, extraction_records!inner(user_id)')
          .in('id', chunkIds);
        if (error) throw new Error(`Fetch chunks failed: ${error.message}`);
        // Owner scope (defense in depth on top of RLS).
        targetChunks = (data || []).filter((c: any) => c.extraction_records?.user_id === (req as any).user.id);
      }

      if (targetChunks.length === 0) {
        return res.status(400).json({ error: 'No chunks provided to act on.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
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
        // Deterministic fallback: honor a few common instructions locally.
        resultText = localChunkAction(targetChunks, instruction, allChunksContext);
      } else {
        const client = getGeminiClient();
        const modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
        let response: any = null;
        let lastError: any = null;
        for (const currentModel of modelsToTry) {
          try {
            response = await client.models.generateContent({
              model: currentModel,
              contents: prompt,
              config: {
                systemInstruction: 'You act on exact verbatim chunks per the user instruction, never fabricating unsupported facts.',
              },
            });
            if (response && response.text) {
              modelUsed = currentModel;
              break;
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`Chunk action ${currentModel} error:`, err?.message);
          }
        }
        if (!response || !response.text) {
          if (lastError) throw lastError;
          resultText = localChunkAction(targetChunks, instruction, allChunksContext);
        } else {
          resultText = response.text.trim();
        }
      }

      res.json({
        result: resultText,
        modelUsed,
        chunkCount: targetChunks.length,
      });
    } catch (err: any) {
      console.error('Chunk action error:', err);
      res.status(500).json({ error: err.message || 'Chunk action failed.' });
    }
  });

  // ---------- Helpers ----------
  function extractFallbackEntities(rawText: string) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const results: any[] = [];
    let id = 1;

    for (const line of lines) {
      let cleanLine = line.replace(/^(User:|AI:|Human:|Assistant:|\*|-|\d+\.)\s*/i, '').trim();
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

  function localCompile(quotes: any[], docTitle: string, format: string): string {
    if (format === 'flow') {
      return `# ${docTitle}\n\n` + quotes.map(q => q.verbatimText).join(' ');
    }
    if (format === 'markdown') {
      return `# ${docTitle}\n\n*Generated: ${new Date().toLocaleDateString()}*\n\n` +
        quotes.map((q, i) => `### ${i + 1}. [${q.category || 'QUOTE'}]\n> "${q.verbatimText}"\n\n*Confidence: ${q.score || 90}%${q.note ? ` | Context: ${q.note}` : ''}*`).join('\n\n---\n\n');
    }
    const grouped: { [key: string]: any[] } = {};
    quotes.forEach(q => {
      const cat = q.category || 'GENERAL';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(q);
    });
    let out = `# ${docTitle}\n\n`;
    for (const [cat, items] of Object.entries(grouped)) {
      out += `## ${cat}\n\n`;
      items.forEach(item => { out += `- "${item.verbatimText}"\n`; });
      out += '\n';
    }
    return out;
  }

  function localChunkAction(chunks: any[], instruction: string, allChunksContext?: string): string {
    const text = chunks.map((c: any) => c.verbatimText || c.verbatim_text || '').join('\n\n');
    const lower = instruction.toLowerCase();
    if (lower.includes('list') || lower.includes('bullet')) {
      return chunks.map((c: any) => `- ${c.verbatimText || c.verbatim_text}`).join('\n');
    }
    if (lower.includes('count') || lower.includes('how many')) {
      return `There are ${chunks.length} chunk(s) in the selection.`;
    }
    if (lower.includes('categor') || lower.includes('group')) {
      const grouped: { [k: string]: any[] } = {};
      chunks.forEach(c => { const k = c.category || 'GENERAL'; (grouped[k] = grouped[k] || []).push(c); });
      let out = '';
      for (const [cat, items] of Object.entries(grouped)) {
        out += `## ${cat}\n` + items.map((c: any) => `- ${c.verbatimText || c.verbatim_text}`).join('\n') + '\n\n';
      }
      return out.trim();
    }
    // Default: echo the chunks under the instruction.
    return `### Instruction\n${instruction}\n\n### Selected chunks\n${text}`;
  }

  // ---------- Vite middleware (dev) / static (prod) ----------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Iroko server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
