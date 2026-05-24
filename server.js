import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

/** BMKG open data — avoids browser CORS issues for RSS / optional JSON proxy */
app.get('/api/bmkg/nowcast', async (req, res) => {
  try {
    const r = await fetch('https://www.bmkg.go.id/alerts/nowcast/id', {
      signal: AbortSignal.timeout(20000),
    });
    const text = await r.text();
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.status(r.ok ? 200 : 502).send(text);
  } catch (e) {
    console.error('BMKG nowcast proxy:', e);
    res.status(500).json({ error: e.message || 'BMKG nowcast fetch failed' });
  }
});

app.get('/api/bmkg/prakiraan', async (req, res) => {
  const adm4 = req.query.adm4;
  if (!adm4 || typeof adm4 !== 'string') {
    return res.status(400).json({ error: 'adm4 query parameter required' });
  }
  try {
    const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const json = await r.json();
    res.status(r.ok ? 200 : 502).json(json);
  } catch (e) {
    console.error('BMKG prakiraan proxy:', e);
    res.status(500).json({ error: e.message || 'BMKG prakiraan fetch failed' });
  }
});

// Proxy endpoint for Groq Chat API
app.post('/api/chat', async (req, res) => {
    try {
        const apiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error: GROQ API Key missing.' });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error('Proxy Error:', e);
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n🛡️ Secure API Proxy is running on http://localhost:${PORT}`);
    console.log(`Requests to Groq are now safely routed through this backend.\n`);
});
