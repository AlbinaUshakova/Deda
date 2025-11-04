'use client';

import React, { useMemo, useState } from 'react';
import BlocksGrid from './BlocksGrid';

type Word = { ge: string; ru: string; audio?: string };

type BlocksGameProps = {
  words: Word[];
};

type Question = {
  ge: string;
  ru: string;
};

function normalizeRu(str: string) {
  return str.trim().toLowerCase();
}

function buildRandomQuestion(words: Word[]): Question | null {
  if (!words.length) return null;
  const idx = Math.floor(Math.random() * words.length);
  const w = words[idx];
  return { ge: w.ge, ru: w.ru };
}

export default function BlocksGame({ words }: BlocksGameProps) {
  const hasWords = useMemo(() => words && words.length > 0, [words]);

  // Состояние "сейчас надо ответить на задание?"
  const [awaitingAnswer, setAwaitingAnswer] = useState(true);

  // roundId – счётчик раундов (каждый раз новый набор фигур)
  const [roundId, setRoundId] = useState(0);

  const [question, setQuestion] = useState<Question | null>(() =>
    hasWords ? buildRandomQuestion(words) : null,
  );
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);

  // Верный ответ — запускаем новый раунд фигур
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;

    const normUser = normalizeRu(answer);
    const normCorrect = normalizeRu(question.ru);

    if (!normUser) return;

    if (normUser === normCorrect) {
      setError(false);
      setAnswer('');
      setAwaitingAnswer(false);              // прячем задание
      setRoundId(prev => prev + 1);          // новый раунд фигур
      setQuestion(buildRandomQuestion(words)); // подготовим следующее задание
    } else {
      setError(true);
    }
  };

  // Когда все 3 фигуры раунда поставлены – ждём новое задание
  const handleRoundFinished = () => {
    setAwaitingAnswer(true);
  };

  // Игрок нажал "Сыграть снова" после "нет ходов" → очищаем поле/очки (это делает BlocksGrid)
  // и снова показываем задание.
  const handleRestartRequested = () => {
    setAwaitingAnswer(true);
    setRoundId(0); // следующий верный ответ начнёт раунд с 1
  };

  return (
    <div className="flex w-full justify-center">
      <div className="flex w-full max-w-6xl gap-10 items-stretch py-6">
        {/* ЛЕВАЯ КОЛОНКА: либо задание, либо просто пустое место того же размера */}
        <div className="flex flex-col justify-start flex-[0.35]">
          {awaitingAnswer && (
            <div>
              <div className="text-lg font-semibold mb-2">Задание</div>

              {!hasWords && (
                <div className="text-sm text-neutral-400">
                  В этом эпизоде пока нет слов.
                </div>
              )}

              {hasWords && question && (
                <>
                  <div className="text-sm text-neutral-400 mb-2">
                    Переведи на русский:
                  </div>
                  <div className="text-2xl mb-6">{question.ge}</div>

                  <form
                    onSubmit={handleSubmit}
                    className="flex items-center gap-2 mb-2"
                  >
                    <input
                      value={answer}
                      onChange={e => {
                        setAnswer(e.target.value);
                        if (error) setError(false);
                      }}
                      placeholder="введите ответ"
                      className={
                        'px-3 py-2 rounded-lg border bg-transparent text-white outline-none w-full max-w-xs ' +
                        (error
                          ? 'border-red-500'
                          : 'border-[#4b5563] focus:border-blue-400')
                      }
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    >
                      Ок
                    </button>
                  </form>

                  {error && (
                    <div className="text-xs text-red-400">
                      Неверно, попробуй ещё раз.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ПРАВАЯ КОЛОНКА: поле + фигуры */}
        <div className="flex-1 flex justify-center items-center">
          <BlocksGrid
            roundId={roundId}
            onRoundFinished={handleRoundFinished}
            onRestartRequested={handleRestartRequested}
          />
        </div>
      </div>
    </div>
  );
}
