'use client';

import { useEffect, useState } from 'react';
import { playLetterAudio } from '@/lib/playLetterAudio';
import { getSettings } from '@/lib/settings';
import { geLetterToHint, type TransliterationMode } from '@/lib/transliteration';

const GEORGIAN_ALPHABET = [
  'ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'თ', 'ი', 'კ', 'ლ',
  'მ', 'ნ', 'ო', 'პ', 'ჟ', 'რ', 'ს', 'ტ', 'უ', 'ფ', 'ქ',
  'ღ', 'ყ', 'შ', 'ჩ', 'ც', 'ძ', 'წ', 'ჭ', 'ხ', 'ჯ', 'ჰ',
];

const GEORGIAN_ALPHABET_ROWS = [
  GEORGIAN_ALPHABET.slice(0, 7),
  GEORGIAN_ALPHABET.slice(7, 14),
  GEORGIAN_ALPHABET.slice(14, 21),
  GEORGIAN_ALPHABET.slice(21, 28),
  GEORGIAN_ALPHABET.slice(28),
];

const geLetterAudioMap: Record<string, string> = {
  'ა': '/audio/letters/01-ani.mp3',
  'ბ': '/audio/letters/02-bani.mp3',
  'გ': '/audio/letters/03-gani.mp3',
  'დ': '/audio/letters/04-doni.mp3',
  'ე': '/audio/letters/05-eni.mp3',
  'ვ': '/audio/letters/06-vini.mp3',
  'ზ': '/audio/letters/07-zeni.mp3',
  'თ': '/audio/letters/08-tani.mp3',
  'ი': '/audio/letters/09-ini.mp3',
  'კ': '/audio/letters/10-kani.mp3',
  'ლ': '/audio/letters/11-lasi.mp3',
  'მ': '/audio/letters/12-mani.mp3',
  'ნ': '/audio/letters/13-nari.mp3',
  'ო': '/audio/letters/14-oni.mp3',
  'პ': '/audio/letters/15-pari.mp3',
  'ჟ': '/audio/letters/16-jhani.mp3',
  'რ': '/audio/letters/17-rae.mp3',
  'ს': '/audio/letters/18-sani.mp3',
  'ტ': '/audio/letters/19-tari.mp3',
  'უ': '/audio/letters/20-uni.mp3',
  'ფ': '/audio/letters/21-phari.mp3',
  'ქ': '/audio/letters/22-khani-q.mp3',
  'ღ': '/audio/letters/23-ghani.mp3',
  'ყ': '/audio/letters/24-qari.mp3',
  'შ': '/audio/letters/25-shini.mp3',
  'ჩ': '/audio/letters/26-chini.mp3',
  'ც': '/audio/letters/27-tsani.mp3',
  'ძ': '/audio/letters/28-dzili.mp3',
  'წ': '/audio/letters/29-tsili.mp3',
  'ჭ': '/audio/letters/30-chari.mp3',
  'ხ': '/audio/letters/31-khani-x.mp3',
  'ჯ': '/audio/letters/32-jani.mp3',
  'ჰ': '/audio/letters/33-hae.mp3',
};

export default function LandingAlphabet() {
  const [transliterationMode, setTransliterationMode] = useState<TransliterationMode>('ru');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncSettings = () => {
      setTransliterationMode(getSettings().transliterationMode);
    };
    syncSettings();
    window.addEventListener('deda:settings-updated', syncSettings as EventListener);
    return () => window.removeEventListener('deda:settings-updated', syncSettings as EventListener);
  }, []);

  const speakLetter = (letter: string) => {
    void playLetterAudio({
      audioSrc: geLetterAudioMap[letter],
      fallbackText: letter,
    });
  };

  return (
    <div className="landing-alphabet-shell rounded-[clamp(10px,1.3vw,15px)] border border-white/70 bg-white/55 p-[clamp(2px,0.45vw,5px)] shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-[6px]">
      <div className="landing-alphabet-rows flex flex-col gap-[clamp(1px,0.34vw,4px)]">
        {GEORGIAN_ALPHABET_ROWS.map((row, rowIdx) => (
          <div
            key={`landing-alphabet-row-${rowIdx}`}
            className={row.length === 7 ? 'landing-alphabet-grid grid grid-cols-7 gap-[clamp(1px,0.34vw,4px)]' : 'landing-alphabet-grid--short grid grid-cols-5 gap-[clamp(1px,0.34vw,4px)] mx-auto w-[calc(71.428%-2px)]'}
          >
            {row.map((ch, index) => (
              <button
                key={ch}
                type="button"
                onClick={() => speakLetter(ch)}
                className={`landing-alphabet-key home-alphabet-key aspect-square rounded-lg border border-slate-200/75 bg-white/90 py-[3px] text-center shadow-sm transition-all hover:border-[rgba(249,115,22,0.35)] hover:bg-slate-50${rowIdx === 0 && index === 0 ? ' home-alphabet-key--active' : ''}`}
                title={`Озвучить букву ${ch}`}
                aria-label={`Озвучить букву ${ch}`}
              >
                <div className="landing-alphabet-letter home-alphabet-letter translate-y-[-1px] text-[clamp(14px,2.7vw,19px)] leading-none text-black">{ch}</div>
                <div className="landing-alphabet-translit home-alphabet-translit mt-[2px] text-[clamp(6px,1.2vw,8px)] leading-none text-slate-400">{geLetterToHint(ch, transliterationMode)}</div>
              </button>
            ))}
          </div>
        ))}
      </div>
      <style jsx>{`
        :global(html[data-theme='dark']) .landing-alphabet-shell {
          border-color: rgba(148, 163, 184, 0.16);
          background: linear-gradient(180deg, rgba(47, 45, 49, 0.58), rgba(31, 32, 36, 0.7));
          box-shadow: 0 12px 24px rgba(2, 6, 23, 0.14);
          backdrop-filter: blur(10px);
        }

        :global(html[data-theme='dark']) .landing-alphabet-key {
          border-color: rgba(148, 163, 184, 0.16) !important;
          background: rgba(58, 56, 62, 0.68) !important;
          box-shadow: 0 1px 4px rgba(2, 6, 23, 0.14) !important;
        }

        :global(html[data-theme='dark']) .landing-alphabet-key.home-alphabet-key--active {
          border-color: rgba(108, 139, 255, 0.33) !important;
          background: rgba(108, 139, 255, 0.055) !important;
          box-shadow:
            0 0 0 1px rgba(108, 139, 255, 0.14),
            0 3px 8px rgba(108, 139, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
        }

        :global(html[data-theme='dark']) .landing-alphabet-key:hover {
          border-color: rgba(249, 115, 22, 0.22) !important;
          background: rgba(64, 62, 70, 0.88) !important;
        }

        :global(html[data-theme='dark']) .landing-alphabet-letter {
          color: #f8fafc !important;
        }

        :global(html[data-theme='dark']) .landing-alphabet-translit {
          color: rgba(203, 213, 225, 0.72) !important;
        }

        @media (max-width: 767px) {
          .landing-alphabet-shell {
            width: 86%;
            margin-inline: auto;
            padding: 2px;
          }

          .landing-alphabet-grid {
            gap: 2px;
          }

          .landing-alphabet-grid--short {
            width: 71.428%;
          }

          .landing-alphabet-key {
            border-radius: 8px;
            padding-top: 2px;
            padding-bottom: 2px;
          }

          .landing-alphabet-letter {
            font-size: clamp(13px, 4.4vw, 18px);
          }

          .landing-alphabet-translit {
            font-size: clamp(6px, 2vw, 8px);
          }
        }
      `}</style>
    </div>
  );
}
