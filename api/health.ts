import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function health(_req: VercelRequest, res: VercelResponse) {
  return res.json({ status: 'ok', engine: 'Iroko Fact & Entity Extractor' });
}
