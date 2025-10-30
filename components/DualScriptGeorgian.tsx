// components/DualScriptGeorgian.tsx
'use client';
/**
 * DualScriptGeorgian
 * Toggle between Printed (Mkhedruli) and Handwritten (stroke-order images).
 *
 * Printed:
 *   - By default renders with a Georgian-capable font (Noto Sans Georgian).
 *   - If you add per-letter images to /public/print/mkhedruli/<LETTER>.svg,
 *     set `preferPrintedImages` = true to render printed via images instead of font.
 *
 * Handwritten:
 *   - Renders each letter as an image from /public/handwriting/mkhedruli/<LETTER>.svg
 *   - If an image is missing, we gracefully fall back to the text glyph.
 */
import React, { useMemo, useState } from 'react';

type Props = {
  word: string;
  size?: number;                 // glyph height in px for image rendering
  gap?: number;                  // gap between letters when using images
  defaultMode?: 'printed' | 'handwritten';
  preferPrintedImages?: boolean; // use /public/print/mkhedruli assets for printed
};

function LettersAsImages({ word, dir, size, gap }: { word: string; dir: 'print' | 'handwriting'; size: number; gap: number }) {
  const letters = useMemo(() => Array.from(word), [word]);
  const base = dir === 'print' ? '/print/mkhedruli' : '/handwriting/mkhedruli';
  return (
    <div className="flex items-end" style={{ gap }}>
      {letters.map((ch, i) => {
        const src = `${base}/${ch}.svg`;
        return (
          <img
            key={`${ch}-${i}`}
            src={src}
            alt={`${dir} ${ch}`}
            height={size}
            style={{ height: size, width: 'auto', display: 'block' }}
            onError={(e) => {
              const span = document.createElement('span');
              span.textContent = ch;
              span.style.fontSize = `${Math.floor(size * 0.9)}px`;
              span.style.lineHeight = `${size}px`;
              span.style.display = 'inline-block';
              e.currentTarget.replaceWith(span);
            }}
          />
        );
      })}
    </div>
  );
}

export default function DualScriptGeorgian({
  word,
  size = 56,
  gap = 6,
  defaultMode = 'printed',
  preferPrintedImages = false,
}: Props) {
  const [mode, setMode] = useState<'printed' | 'handwritten'>(defaultMode);

  return (
    <div className="space-y-2">
      {/* Toggle */}
      <div className="inline-flex rounded-xl overflow-hidden border border-[#2b3344]">
        <button
          className={`px-3 py-1 text-sm ${mode === 'printed' ? 'bg-[#18304d] text-white' : 'bg-[#0e1726] text-neutral-300'}`}
          onClick={() => setMode('printed')}
        >
          Печатное
        </button>
        <button
          className={`px-3 py-1 text-sm ${mode === 'handwritten' ? 'bg-[#18304d] text-white' : 'bg-[#0e1726] text-neutral-300'}`}
          onClick={() => setMode('handwritten')}
        >
          Письменное
        </button>
      </div>

      {/* Content */}
      <div className="rounded-xl bg-[#0e1726] p-3">
        {mode === 'printed' ? (
          preferPrintedImages ? (
            <LettersAsImages word={word} dir="print" size={size} gap={gap} />
          ) : (
            <div
              className="text-3xl"
              style={{ fontFamily: `'Noto Sans Georgian', 'DejaVu Sans', system-ui, sans-serif` }}
            >
              {word}
            </div>
          )
        ) : (
          <>
            <LettersAsImages word={word} dir="handwriting" size={size} gap={gap} />
            <div className="mt-2 text-[11px] text-neutral-500">
              Изображения со штрихами возьми из ресурса урока 9 и положи в <code>/public/handwriting/mkhedruli/LETTER.svg</code>.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
