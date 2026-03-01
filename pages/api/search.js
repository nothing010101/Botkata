// pages/api/search.js
// Serverless function - proxy to KBBI kemdikbud, no CORS issues

export default async function handler(req, res) {
  const { q, type } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    if (type === 'detail') {
      // Fetch detail of a single word
      const result = await fetchWordDetail(q);
      return res.status(200).json(result);
    } else {
      // Fetch list of words starting with prefix
      const result = await fetchWordList(q);
      return res.status(200).json(result);
    }
  } catch (err) {
    console.error('KBBI fetch error:', err.message);
    return res.status(500).json({ error: err.message, words: [] });
  }
}

async function fetchWordList(query) {
  const url = `https://kbbi.kemdikbud.go.id/Cari/Hasil?l=1&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      'Referer': 'https://kbbi.kemdikbud.go.id/',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`KBBI responded with status ${response.status}`);
  }

  const html = await response.text();
  return parseSearchResults(html, query);
}

async function fetchWordDetail(word) {
  const url = `https://kbbi.kemdikbud.go.id/entri/${encodeURIComponent(word)}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      'Referer': 'https://kbbi.kemdikbud.go.id/',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`KBBI responded with status ${response.status}`);
  }

  const html = await response.text();
  return parseWordDetail(html, word);
}

function parseSearchResults(html, query) {
  const words = [];

  // Extract entries from search result page
  // KBBI returns either a list page or a direct entry page

  // Pattern 1: List of results - links in result list
  const listPattern = /href="\/entri\/([^"]+)"/g;
  const seen = new Set();
  let match;

  while ((match = listPattern.exec(html)) !== null) {
    const raw = decodeURIComponent(match[1]);
    const word = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (word && word.length > 0 && word.length < 60 && !seen.has(word)) {
      seen.add(word);
      words.push({ word, lema: word });
    }
  }

  // Pattern 2: Inline entries on same page (when few results)
  // Extract h2 titles inside .entri blocks
  const entryH2 = /<h2[^>]*>([^<]+)<\/h2>/gi;
  while ((match = entryH2.exec(html)) !== null) {
    const w = match[1].trim().replace(/ \(\d+\)$/, '').replace(/\d+$/, '').trim().toLowerCase();
    if (w && w.length > 1 && w.length < 60 && !seen.has(w)) {
      seen.add(w);
      words.push({ word: w, lema: w });
    }
  }

  // Deduplicate and sort
  const unique = [...new Map(words.map(w => [w.word, w])).values()];
  unique.sort((a, b) => a.word.localeCompare(b.word, 'id'));

  return {
    query,
    total: unique.length,
    source: 'KBBI Kemendikbud',
    sourceUrl: `https://kbbi.kemdikbud.go.id/Cari/Hasil?q=${encodeURIComponent(query)}`,
    words: unique,
  };
}

function parseWordDetail(html, word) {
  const entries = [];

  // Extract .entri blocks
  const entryBlocks = html.split(/<\/ol>/i);

  // Simple regex extraction for definitions
  // Get all <li> content inside the main content area
  const definitionPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const kelasPattern = /<span class="kelas"[^>]*><abbr[^>]*>([^<]+)<\/abbr><\/span>/i;
  const contohPattern = /<span class="contoh"[^>]*>([\s\S]*?)<\/span>/i;

  // Find main entry section
  const mainContent = html.match(/<div[^>]+id="d1"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || html;

  const definitions = [];
  let defMatch;
  let count = 0;

  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  while ((defMatch = liPattern.exec(mainContent)) !== null && count < 20) {
    const raw = defMatch[1];
    // Strip HTML tags for clean text
    const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text && text.length > 5) {
      const kelasM = raw.match(kelasPattern);
      const contohM = raw.match(contohPattern);
      definitions.push({
        num: count + 1,
        kelas: kelasM ? kelasM[1].trim() : '',
        text: text.replace(kelasM ? kelasM[1] : '', '').replace(contohM ? contohM[1].replace(/<[^>]+>/g,'') : '', '').replace(/\s+/g,' ').trim(),
        contoh: contohM ? contohM[1].replace(/<[^>]+>/g, '').trim() : '',
      });
      count++;
    }
  }

  // Get word title/lema - might have pronunciation dots
  const h2Match = html.match(/<h2[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
  const lema = h2Match ? h2Match[1].replace(/<[^>]+>/g, '').trim() : word;

  // kata dasar
  const dasarMatch = html.match(/kata dasar[^<]*<[^>]+>([^<]+)<\/a>/i);
  const kataDasar = dasarMatch ? dasarMatch[1].trim() : '';

  return {
    word,
    lema,
    kataDasar,
    definitions: definitions.filter(d => d.text.length > 3),
    sourceUrl: `https://kbbi.kemdikbud.go.id/entri/${encodeURIComponent(word)}`,
    source: 'KBBI Kemendikbud',
  };
}
