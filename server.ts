import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  verifyAuth,
  runExtraction,
  runCompileDocument,
  runChunkAction,
  AuthUser,
} from './server/lib';

dotenv.config();

// ---------- Auth middleware ----------
// Requires a valid Supabase session JWT in the Authorization header.
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = (req.headers.authorization || '').toString();
  const user = await verifyAuth(authHeader);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  (req as any).user = user;
  next();
}

function sendResult(res: express.Response, result: { status: number; json: any }) {
  return res.status(result.status).json(result.json);
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
      const user: AuthUser = (req as any).user;
      const result = await runExtraction(user, req.body);
      sendResult(res, result);
    } catch (err: any) {
      console.error('Extraction error:', err);
      res.status(500).json({ error: err.message || 'Extraction failed.' });
    }
  });

  // ---------- Compile Verbatim Document API (auth) ----------
  app.post('/api/compile-document', requireAuth, async (req, res) => {
    try {
      const user: AuthUser = (req as any).user;
      const result = await runCompileDocument(user, req.body);
      sendResult(res, result);
    } catch (err: any) {
      console.error('Compile error:', err);
      res.status(500).json({ error: err.message || 'Compilation failed.' });
    }
  });

  // ---------- Chunk Action API (per-chunk / bulk free-text instructions) ----------
  app.post('/api/chunk-action', requireAuth, async (req, res) => {
    try {
      const user: AuthUser = (req as any).user;
      const result = await runChunkAction(user, req.body);
      sendResult(res, result);
    } catch (err: any) {
      console.error('Chunk action error:', err);
      res.status(500).json({ error: err.message || 'Chunk action failed.' });
    }
  });

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
