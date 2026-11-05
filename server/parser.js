import crypto from 'crypto';

// Normalised hash so the same quote is never stored twice for a book
export function hashQuote(text) {
  const norm = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha1').update(norm).digest('hex');
}

// ReadEra export: line 1 = title, line 2 = author, quotes separated by *****
export function parseReadEra(raw) {
  let text = String(raw || '').replace(/\r\n?/g, '\n');

  // remove the "-- Reading books with ReadEra / https://readera.org" footer
  text = text.replace(/\n-{2,}[ \t]*\n\s*Reading books with ReadEra[\s\S]*$/i, '');
  text = text
    .replace(/^\s*Reading books with ReadEra\s*$/gim, '')
    .replace(/^\s*https?:\/\/readera\.org\s*$/gim, '');

  const lines = text.split('\n');
  const next = () => {
    while (lines.length && !lines[0].trim()) lines.shift();
    return (lines.shift() || '').trim();
  };
  const title = next();
  const author = next();
  const quotes = lines
    .join('\n')
    .split(/^\s*\*{3,}\s*$/m)
    .map((q) => q.trim())
    .filter(Boolean);

  return { title, author, quotes };
}
