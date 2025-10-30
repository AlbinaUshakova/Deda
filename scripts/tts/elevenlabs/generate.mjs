import fs from 'node:fs'; import path from 'node:path';
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const VOICE_ID_LETTER = process.env.ELEVENLABS_VOICE_ID_LETTER || VOICE_ID;
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
if (!API_KEY) { console.error('Missing ELEVENLABS_API_KEY'); process.exit(1); }
const input = process.argv[2] || 'public/content/ka_ru_all.json';
const abs = path.resolve(process.cwd(), input);
if (!fs.existsSync(abs)) { console.error('Input not found:', abs); process.exit(1); }
const raw = fs.readFileSync(abs, 'utf-8'); const data = JSON.parse(raw);
const outDir = path.resolve(process.cwd(), 'public', 'audio'); fs.mkdirSync(outDir, { recursive: true });
function safeName(card){ if(card.translit && /^[a-z0-9_-]+$/i.test(card.translit)) return card.translit.toLowerCase(); return Array.from(card.ge_text).map(c=>c.codePointAt(0).toString(16)).join('_'); }
async function tts(text, filename, voiceId){
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method:'POST', headers:{'xi-api-key':API_KEY,'Content-Type':'application/json'},
    body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings:{ stability:0.4, similarity_boost:0.7, style:0.3 }, output_format:'mp3_22050_32' })
  });
  if(!res.ok){ const t = await res.text().catch(()=> ''); throw new Error(`TTS failed ${res.status}: ${t}`) }
  const buf = Buffer.from(await res.arrayBuffer()); fs.writeFileSync(filename, buf);
}
(async()=>{
  const episodes = Array.isArray(data.episodes) ? data.episodes : [];
  let ok=0, skip=0, fail=0;
  for(const ep of episodes){
    for(const c of ep.cards || []){
      if(!c.ge_text) continue;
      const name = safeName(c); const out = path.join(outDir, `${name}.mp3`);
      if(fs.existsSync(out)){ skip++; continue; }
      try{ const v = (c.type === 'letter') ? VOICE_ID_LETTER : VOICE_ID; console.log('TTS:', c.ge_text, '→', path.basename(out)); await tts(c.ge_text, out, v); ok++; c.audio_url = `/audio/${path.basename(out)}`; }
      catch(e){ console.error('Fail', c.ge_text, e.message); fail++; }
      await new Promise(r=>setTimeout(r,300));
    }
  }
  fs.writeFileSync(abs, JSON.stringify(data,null,2), 'utf-8');
  console.log(`Done ok=${ok} skip=${skip} fail=${fail}`);
})().catch(e=>{ console.error(e); process.exit(1); });
