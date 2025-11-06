// src/components/BlocksGame.tsx
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import BlocksGrid from './BlocksGrid';

type Word = { ge: string; ru: string; audio?: string };

type BlocksGameProps = {
  words: Word[];
  episodeId?: string;
};

type Question = {
  ge: string;
  ru: string;
};

type Mode = 'question' | 'pieces' | 'gameOver';

const LEFT_COLUMN_WIDTH = 220;
const LEFT_COLUMN_HEIGHT = 'min(72vh, 640px)';

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

  // режим: слева показываем задание / фигуры / "нет ходов"
  const [mode, setMode] = useState<Mode>('question');
  const [roundId, setRoundId] = useState(0);

  const [question, setQuestion] = useState<Question | null>(() =>
    hasWords ? buildRandomQuestion(words) : null,
  );
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);

  // количество неверных попыток для текущего слова
  const [attempts, setAttempts] = useState(0);
  // показываем ли правильный ответ после 3 ошибок (ответ в инпуте)
  const [showCorrect, setShowCorrect] = useState(false);

  // плавная видимость фигур
  const [showPalette, setShowPalette] = useState(false);

  // Жёсткий флаг: пока true — задание НЕЛЬЗЯ показывать (мы в "нет ходов"),
  // сбрасываем только после "Сыграть снова"
  const [hardGameOver, setHardGameOver] = useState(false);

  // вспомогательная функция: перейти к новому случайному слову
  const gotoRandomQuestion = () => {
    if (!hasWords) {
      setQuestion(null);
      return;
    }
    setQuestion(buildRandomQuestion(words));
    setAnswer('');
    setError(false);
    setAttempts(0);
    setShowCorrect(false);
  };

  // при смене слов/эпизода — обновляем задание
  useEffect(() => {
    if (hasWords) {
      gotoRandomQuestion();
    } else {
      setQuestion(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWords, words]);

  // анимация фигур: включаем только в режиме pieces
  useEffect(() => {
    if (mode === 'pieces') {
      const t = setTimeout(() => setShowPalette(true), 400);
      return () => clearTimeout(t);
    }
    setShowPalette(false);
  }, [mode]);

  // отправка ответа (по Enter)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== 'question' || !question || hardGameOver) return;

    // если уже показали правильный ответ в инпуте —
    // Enter означает "перейти к следующему слову"
    if (showCorrect) {
      gotoRandomQuestion();
      return;
    }

    const normUser = normalizeRu(answer);
    const normCorrect = normalizeRu(question.ru);
    if (!normUser) return;

    if (normUser === normCorrect) {
      // верный ответ → стартуем раунд фигур
      setError(false);
      setAnswer('');
      setAttempts(0);
      setShowCorrect(false);

      setMode('pieces'); // задание плавно уезжает вниз
      setRoundId(prev => (prev > 0 ? prev + 1 : 1));
      // следующее задание появится только через handleRoundFinished
    } else {
      // неверный ответ
      setAttempts(prev => {
        const next = prev + 1;

        if (next >= 3) {
          // после 3-й ошибки показываем правильный ответ прямо в поле ввода
          setShowCorrect(true);
          setError(false);
          setAnswer(question.ru); // подставляем правильный ответ в инпут
        } else {
          setError(true);
        }

        return next;
      });
    }
  };

  // "Обновить" — взять другое слово
  const handleSkipQuestion = () => {
    if (!hasWords || hardGameOver) return;
    gotoRandomQuestion();
  };

  // все 3 фигуры раунда поставлены → следующее задание
  const handleRoundFinished = () => {
    if (!hasWords) return;
    if (hardGameOver) return; // если уже "нет ходов", игнорируем

    // новый шаг цикла: показываем следующее задание
    setMode('question'); // задание выезжает снизу вверх
    gotoRandomQuestion();
  };

  // поле сообщило, что ходов больше нет
  const handleGameOver = () => {
    // цикл "задание–фигуры–задание" обрывается
    setMode('gameOver');
    setHardGameOver(true); // с этого момента задания запрещены до рестарта
  };

  // нажали "Сыграть снова"
  const handleRestartRequested = () => {
    // запускаем НОВЫЙ цикл: начинаем снова с задания
    setHardGameOver(false); // снова разрешаем задания
    setMode('question');
    setRoundId(0); // чтобы следующий верный ответ дал новый раунд фигур
    gotoRandomQuestion();
  };

  const isQuestionVisible = mode === 'question';
  const isGameOver = mode === 'gameOver';

  // Рендерить панель задания можно только если:
  //  - мы НЕ в режиме gameOver
  //  - и hardGameOver == false (нет "жёсткого" геймовера)
  const shouldRenderQuestionPanel = !isGameOver && !hardGameOver;

  return (
    <div className="flex w-full justify-center">
      <div className="flex w-full max-w-5xl items-start gap-10 py-16 mx-6">
        {/* ЛЕВАЯ ОБЛАСТЬ: задание / фигуры */}
        <div
          className="shrink-0"
          style={{ width: LEFT_COLUMN_WIDTH }}
        >
          {/* mt-8 — опускаем левую область так,
              чтобы верх слова совпал с верхней границей игрового поля */}
          <div
            className="relative mt-8"
            style={{ height: LEFT_COLUMN_HEIGHT }}
          >
            {/* ПАНЕЛЬ ЗАДАНИЯ */}
            {shouldRenderQuestionPanel && (
              <div
                className={
                  'absolute inset-0 transition-all duration-700 ' +
                  (isQuestionVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-16 pointer-events-none')
                }
              >
                {/* Текст задания привязан к верхней границе окна */}
                <div className="flex flex-col items-start justify-start h-full px-2 pt-1">
                  {hasWords && question && (
                    <>
                      <div className="text-2xl mb-6">{question.ge}</div>

                      {/* ввод + Enter */}
                      <form
                        onSubmit={handleSubmit}
                        className="mb-2 w-full"
                      >
                        <input
                          value={answer}
                          onChange={e => {
                            setAnswer(e.target.value);
                            if (error) setError(false);
                          }}
                          placeholder="введите перевод"
                          readOnly={showCorrect} // когда показан правильный ответ — только Enter, без редактирования
                          className={
                            'px-3 py-2 rounded-lg border bg-transparent text-white outline-none text-base w-full ' +
                            (error && !showCorrect
                              ? 'border-red-500'
                              : 'border-[#4b5563] focus:border-blue-400')
                          }
                          style={{ maxWidth: '240px' }} // примерно 5 клеток
                        />
                      </form>

                      {/* кнопка "Обновить" */}
                      <button
                        type="button"
                        onClick={handleSkipQuestion}
                        className="mt-2 flex items-center gap-2 text-sm text-neutral-300 hover:text-white"
                        disabled={showCorrect}
                      >
                        <span className="text-lg">↻</span>
                        <span>Обновить</span>
                      </button>

                      {/* ошибка */}
                      {error && !showCorrect && (
                        <div className="mt-2 text-xs text-red-400">
                          Неверно, попробуй ещё раз.
                        </div>
                      )}

                      {/* отдельный текст про правильный ответ уже не нужен —
                          он отображается прямо в поле ввода */}
                    </>
                  )}

                  {!hasWords && (
                    <div className="text-sm text-neutral-400">
                      В этом эпизоде пока нет слов.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* СЛОТ ДЛЯ ФИГУР — центр по высоте, просто появление/исчезновение */}
            <div
              id="blocks-palette-slot"
              className={
                'absolute inset-0 flex items-center justify-center transition-opacity duration-300 ' +
                (showPalette
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none')
              }
            />
          </div>
        </div>

        {/* ПРАВАЯ ОБЛАСТЬ: игровое поле */}
        <div className="flex-1 flex justify-start">
          <BlocksGrid
            roundId={roundId}
            onRoundFinished={handleRoundFinished}
            onRestartRequested={handleRestartRequested}
            onGameOver={handleGameOver}
          />
        </div>
      </div>
    </div>
  );
}
