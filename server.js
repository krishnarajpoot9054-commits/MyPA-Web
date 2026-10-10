'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !m[1].startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
const recentRequests = new Map();
function send(res, status, data, type='application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Cache-Control':'no-store' });
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}
function readBody(req, max=24_000) {
  return new Promise((resolve, reject) => {
    let data='';
    req.on('data', chunk => { data += chunk; if (data.length > max) { reject(new Error('Request too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok:true, aiConfigured:Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'PASTE_YOUR_NEW_KEY_HERE') });
  if (req.method === 'POST' && url.pathname === '/api/ai') {
    const ip = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const prior = recentRequests.get(ip) || [];
    const active = prior.filter(t => now - t < 60_000);
    if (active.length >= 12) return send(res, 429, { error:'Too many requests. Please wait a minute and try again.' });
    active.push(now); recentRequests.set(ip, active);
    let body;
    try { body = await readBody(req); } catch (e) { return send(res, 400, { error:e.message }); }
    const prompt = typeof body.message === 'string' ? body.message.trim() : '';
    const context = body.context && typeof body.context === 'object' ? JSON.stringify({tasks:Array.isArray(body.context.tasks)?body.context.tasks.slice(0,30):[],classes:Array.isArray(body.context.classes)?body.context.classes.slice(0,20):[],sleep:body.context.sleep||null}).slice(0,10000) : '';
    if (!prompt || prompt.length > 6000) return send(res, 400, { error:'Enter a message (maximum 6000 characters).' });
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'PASTE_YOUR_NEW_KEY_HERE') return send(res, 503, { error:'AI is not configured yet. Add GEMINI_API_KEY to the server .env file and restart.' });
    try {
      const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
        method:'POST', headers:{ 'Content-Type':'application/json', 'x-goog-api-key':key },
        body:JSON.stringify({ systemInstruction:{parts:[{text:'You are MyPA, a helpful student personal assistant. Reply clearly and concisely. Use simple English, Hindi, or Hinglish to match the user. Do not claim to have changed tasks, calendars, reminders, or attendance; the app handles those only through explicit UI actions.'}]}, contents:[{role:'user',parts:[{text:context ? `User message: ${prompt}\n\nMyPA workspace context (use only to make suggestions; do not claim changes were made): ${context}` : prompt}]}], generationConfig:{temperature:0.5,maxOutputTokens:900} }),
        signal:AbortSignal.timeout(45_000)
      });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const msg = result?.error?.message || `Gemini returned HTTP ${upstream.status}`;
        return send(res, upstream.status === 429 ? 429 : upstream.status >= 500 ? 502 : upstream.status, { error:msg, upstreamStatus:upstream.status });
      }
      const text = (result.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
      if (!text) return send(res, 502, { error:'Gemini returned an empty response. Try again.' });
      return send(res, 200, { text });
    } catch (e) {
      return send(res, 502, { error: e.name === 'TimeoutError' ? 'Gemini request timed out. Try again.' : 'Could not connect to Gemini. Check the server internet connection.' });
    }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error:'Method not allowed' });
  let requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const file = path.resolve(PUBLIC, '.' + requested);
  if (!file.startsWith(PUBLIC + path.sep) && file !== path.join(PUBLIC, 'index.html')) return send(res, 403, {error:'Forbidden'});
  fs.readFile(file, (err, content) => {
    if (err) return send(res, 404, {error:'Not found'});
    send(res, 200, req.method === 'HEAD' ? '' : content, MIME[path.extname(file)] || 'application/octet-stream');
  });
});
server.listen(PORT, '0.0.0.0', () => console.log(`MyPA running at http://localhost:${PORT}`));
