# Deda — full MVP (v1)

## Запуск
```bash
npm install
npm run dev
# http://localhost:3000
```

## Что внутри
- Карту эпизодов с анлоками (≥500 очков)
- Учить (flip‑карточки с аудио)
- Играть (Blocks 8×8) с очками, серией, таймером и автоплеем
- Настройки: выбор алфавита изучения и родного языка
- Прогресс офлайн (LocalStorage) + Supabase‑ready
- Контент JSON `public/content/ka_ru_all.json` для ep1–ep4

## TTS (настоящая озвучка)
```bash
# добавь ключи в .env.local (см. .env.example)
node scripts/tts/elevenlabs/generate.mjs public/content/ka_ru_all.json
```
Файлы сохранятся в `public/audio/*.mp3`, а JSON обновится.
