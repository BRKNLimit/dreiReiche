// Kleiner statischer Server fuer dist/: `npm run serve`, dann
// http://localhost:8765/ (2D), /drei-reiche-3d.html, /karteneditor.html,
// /galerie.html. Die Seiten laufen auch direkt als Datei; ueber http
// verhalten sich Browser-Speicher und manche Vorschaufenster verlaesslicher.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT) || 8765;
const typen = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript' };

createServer(async (req, res) => {
  const pfad = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[\\/]+/, '') || 'resonit.html';
  if (pfad.includes('..')) return res.writeHead(403).end();
  try {
    const daten = await readFile(join(wurzel, pfad));
    res.writeHead(200, { 'content-type': typen[extname(pfad)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(daten);
  } catch {
    res.writeHead(404).end('nicht gefunden');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Die drei Reiche: http://localhost:${PORT}/`));
