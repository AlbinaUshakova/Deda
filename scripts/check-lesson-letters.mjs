import fs from 'node:fs';
import path from 'node:path';

const contentDir = path.join(process.cwd(), 'public', 'content');
const files = fs.readdirSync(contentDir)
  .filter(name => /^ka_ru_ep\d+\.json$/.test(name))
  .sort((a, b) => {
    const aNum = Number(a.match(/\d+/)?.[0] ?? 0);
    const bNum = Number(b.match(/\d+/)?.[0] ?? 0);
    return aNum - bNum;
  });

const isGeorgianLetter = ch => /[\u10D0-\u10FF]/.test(ch);
const seen = new Set();
let hasErrors = false;

for (const file of files) {
  const fullPath = path.join(contentDir, file);
  const episode = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const lessonLetters = Array.isArray(episode.letters) ? episode.letters : [];
  const allowed = new Set([...seen, ...lessonLetters]);
  const issues = [];

  for (const [index, card] of (episode.cards ?? []).entries()) {
    const text = typeof card.ge_text === 'string' ? card.ge_text : '';
    const missing = [...new Set([...text].filter(ch => isGeorgianLetter(ch) && !allowed.has(ch)))];
    if (missing.length > 0) {
      issues.push({
        index: index + 1,
        text,
        missing,
      });
    }
  }

  if (issues.length > 0) {
    hasErrors = true;
    console.log(`${episode.title} (${episode.id})`);
    for (const issue of issues) {
      console.log(`  ${issue.index}. missing [${issue.missing.join(', ')}] in "${issue.text}"`);
    }
  }

  lessonLetters.forEach(ch => seen.add(ch));
}

if (!hasErrors) {
  console.log('All lesson cards use only letters from the current lesson or earlier lessons.');
}

process.exitCode = hasErrors ? 1 : 0;
