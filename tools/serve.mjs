// Petit serveur statique pour les tests de bout en bout : sert le jeu construit (dist/ par défaut).
// Usage : node tools/serve.mjs [dossier]   (port : variable PORT, 8000 par défaut)
// Pour jouer en développement, préférer `npm run dev` (Vite).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname, process.argv[2] || 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.map': 'application/json' };
const PORT = Number(process.env.PORT || 8000);
// Préfixe d'URL facultatif, pour servir le jeu comme GitHub Pages (ex. BASE_PATH=/kevlumen/).
const BASE = process.env.BASE_PATH || '/';

createServer(async (req, res) => {
  let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!url.startsWith(BASE)) { res.writeHead(404).end('introuvable'); return; }
  url = '/' + url.slice(BASE.length);
  const path = normalize(url);
  const file = join(ROOT, path.endsWith('/') ? path + 'index.html' : path);
  if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('introuvable'); }
}).listen(PORT, '127.0.0.1', () => console.log(`KevLumen : http://127.0.0.1:${PORT}`));
