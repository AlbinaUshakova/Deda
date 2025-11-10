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

/**
 * Нормализация числовых форм:
 * - "2" → "два"
 * - "два" → "2"
 * - "100" ↔ "сто", "123" ↔ "сто двадцать три", "тысяча" ↔ "1000"
 * Работает в диапазоне 0–1000.
 */
function normalizeNumberForms(str: string): string {
  const smallNumbers: Record<number, string> = {
    0: 'ноль',
    1: 'один',
    2: 'два',
    3: 'три',
    4: 'четыре',
    5: 'пять',
    6: 'шесть',
    7: 'семь',
    8: 'восемь',
    9: 'девять',
    10: 'десять',
    11: 'одиннадцать',
    12: 'двенадцать',
    13: 'тринадцать',
    14: 'четырнадцать',
    15: 'пятнадцать',
    16: 'шестнадцать',
    17: 'семнадцать',
    18: 'восемнадцать',
    19: 'девятнадцать',
    20: 'двадцать',
    30: 'тридцать',
    40: 'сорок',
    50: 'пятьдесят',
    60: 'шестьдесят',
    70: 'семьдесят',
    80: 'восемьдесят',
    90: 'девяносто',
    100: 'сто',
    200: 'двести',
    300: 'триста',
    400: 'четыреста',
    500: 'пятьсот',
    600: 'шестьсот',
    700: 'семьсот',
    800: 'восемьсот',
    900: 'девятьсот',
    1000: 'тысяча',
  };

  const normalizeDigitsToWords = (numStr: string): string => {
    const num = parseInt(numStr, 10);
    if (isNaN(num) || num < 0 || num > 1000) return numStr;
    if (smallNumbers[num]) return smallNumbers[num];

    if (num < 100) {
      const tens = Math.floor(num / 10) * 10;
      const ones = num % 10;
      if (!ones) return smallNumbers[tens];
      return `${smallNumbers[tens]} ${smallNumbers[ones]}`;
    }

    if (num < 1000) {
      const hundreds = Math.floor(num / 100) * 100;
      const rest = num % 100;
      if (!rest) return smallNumbers[hundreds];
      return `${smallNumbers[hundreds]} ${normalizeDigitsToWords(String(rest))}`;
    }

    // 1000
    return 'тысяча';
  };

  const normalizeWordsToDigits = (text: string): string => {
    const mapEntries = Object.entries(smallNumbers);
    let result = 0;
    let temp = 0;
    let hasAny = false;

    const words = text.split(/\s+/);
    for (const w of words) {
      const entry = mapEntries.find(([, v]) => v === w);
      if (!entry) continue;
      hasAny = true;
      const val = parseInt(entry[0], 10);

      if (val === 1000) {
        result += (temp || 1) * 1000;
        temp = 0;
      } else if (val >= 100) {
        temp += val;
      } else {
        temp += val;
      }
    }

    result += temp;

    if (!hasAny) return text;
    return String(result);
  };

  // если строка — число → в слова
  if (/^\d+$/.test(str)) return normalizeDigitsToWords(str);

  // если строка — слова → пробуем собрать число
  const numVersion = normalizeWordsToDigits(str);
  if (numVersion !== str) return numVersion;

  return str;
}

/**
 * Строим один "цикл" слов:
 *  - каждое слово появляется 1 раз
 *  - "сложные" (из hardSet) добавляются ещё раз → всего 2
 * Потом всё перемешиваем.
 */
function buildCycle(total: number, hardSet: Set<number>): number[] {
  if (total <= 0) return [];

  const base: number[] = [];
  for (let i = 0; i < total; i++) base.push(i);

  const extra: number[] = [];
  hardSet.forEach(idx => {
    if (idx >= 0 && idx < total) extra.push(idx);
  });

  const combined = [...base, ...extra];

  // перемешивание Фишера–Йетса
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined;
}

export default function BlocksGame({ words }: BlocksGameProps) {
  const hasWords = useMemo(() => words && words.length > 0, [words]);

  // режим: слева показываем задание / фигуры / "нет ходов"
  const [mode, setMode] = useState<Mode>('question');
  const [roundId, setRoundId] = useState(0);

  const [question, setQuestion] = useState<Question | null>(null);
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

  // планировщик слов
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const [hardSet, setHardSet] = useState<Set<number>>(() => new Set());
  const [queue, setQueue] = useState<number[]>([]);

  // helper: перейти к следующему слову в очереди
  const gotoNextFromQueue = (markHard: boolean) => {
    if (!hasWords) {
      setQuestion(null);
      setCurrentWordIndex(null);
      setQueue([]);
      return;
    }

    setHardSet(prevHard => {
      const newHard = new Set(prevHard);

      // помечаем текущее слово как "сложное", если нужно
      if (markHard && currentWordIndex !== null) {
        newHard.add(currentWordIndex);
      }

      setQueue(prevQueue => {
        let q = prevQueue;

        // если очередь пустая — строим новый цикл с учётом сложных слов
        if (!q.length) {
          q = buildCycle(words.length, newHard);
        }

        if (!q.length) {
          setQuestion(null);
          setCurrentWordIndex(null);
          return [];
        }

        const [nextIdx, ...rest] = q;
        const w = words[nextIdx];

        setCurrentWordIndex(nextIdx);
        setQuestion({ ge: w.ge, ru: w.ru });
        setAnswer('');
        setError(false);
        setAttempts(0);
        setShowCorrect(false);

        return rest;
      });

      return newHard;
    });
  };

  // при смене слов/эпизода — полностью пересобираем цикл
  useEffect(() => {
    if (hasWords) {
      const newHard = new Set<number>();
      const cycle = buildCycle(words.length, newHard);

      if (!cycle.length) {
        setQuestion(null);
        setQueue([]);
        setCurrentWordIndex(null);
        setHardSet(newHard);
        return;
      }

      const [firstIdx, ...rest] = cycle;
      const w = words[firstIdx];

      setCurrentWordIndex(firstIdx);
      setQuestion({ ge: w.ge, ru: w.ru });
      setQueue(rest);
      setHardSet(newHard);

      setAnswer('');
      setError(false);
      setAttempts(0);
      setShowCorrect(false);

      // при смене эпизода логично сбросить game over / раунды
      setHardGameOver(false);
      setMode('question');
      setRoundId(0);
    } else {
      setQuestion(null);
      setQueue([]);
      setCurrentWordIndex(null);
      setHardSet(new Set());
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

  // вычисляем, считается ли текущий ответ правильным
  const isCurrentAnswerCorrect = useMemo(() => {
    if (!question) return false;
    const nu = normalizeRu(answer);
    if (!nu) return false;
    const nc = normalizeRu(question.ru);

    const userAlt = normalizeNumberForms(nu);
    const correctAlt = normalizeNumberForms(nc);

    return (
      nu === nc ||
      userAlt === nc ||
      nu === correctAlt ||
      userAlt === correctAlt
    );
  }, [answer, question]);

  // отправка ответа (по Enter)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== 'question' || !question || hardGameOver) return;

    // если уже показали правильный ответ в инпуте —
    // Enter означает "перейти к следующему слову" (сложное слово)
    if (showCorrect) {
      gotoNextFromQueue(true); // помечаем как сложное
      return;
    }

    const normUser = normalizeRu(answer);
    const normCorrect = normalizeRu(question.ru);
    if (!normUser) return;

    const userAlt = normalizeNumberForms(normUser);
    const correctAlt = normalizeNumberForms(normCorrect);

    const isCorrect =
      normUser === normCorrect ||
      userAlt === normCorrect ||
      normUser === correctAlt ||
      userAlt === correctAlt;

    if (isCorrect) {
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

  // "Обновить" — пропуск слова: без фигур, слово считается сложным
  const handleSkipQuestion = () => {
    if (!hasWords || hardGameOver) return;
    gotoNextFromQueue(true); // пропуск → сложное слово
  };

  // все 3 фигуры раунда поставлены → следующее задание
  const handleRoundFinished = () => {
    if (!hasWords) return;
    if (hardGameOver) return; // если уже "нет ходов", игнорируем

    // новый шаг цикла: показываем следующее задание
    setMode('question'); // задание выезжает снизу вверх
    gotoNextFromQueue(false); // обычный переход, не помечаем как сложное
  };

  // поле сообщило, что ходов больше нет
  const handleGameOver = () => {
    // цикл "задание–фигуры–задание" обрывается
    setMode('gameOver');
    setHardGameOver(true); // с этого момента задания запрещены до рестарта
  };

  // нажали "Сыграть снова"
  const handleRestartRequested = () => {
    // запускаем НОВЫЙ цикл фигур, но слова идём дальше по очереди
    setHardGameOver(false); // снова разрешаем задания
    setMode('question');
    setRoundId(0); // чтобы следующий верный ответ дал новый раунд фигур
    gotoNextFromQueue(false); // берём следующее по очереди, без пометки "сложное"
  };

  const isQuestionVisible = mode === 'question';
  const isGameOver = mode === 'gameOver';

  // Рендерить панель задания можно только если:
  //  - мы НЕ в режиме gameOver
  //  - и hardGameOver == false (нет "жёсткого" геймовера)
  const shouldRenderQuestionPanel = !isGameOver && !hardGameOver;

  return (
    <div className="flex w-full justify_center">
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
                      <form onSubmit={handleSubmit} className="mb-2 w-full">
                        <input
                          value={answer}
                          onChange={e => {
                            setAnswer(e.target.value);
                            if (error) setError(false);
                          }}
                          placeholder="введите перевод"
                          readOnly={showCorrect}
                          className={
                            'px-5 py-3 rounded-xl border outline-none text-2xl tracking-wide transition-all duration-200 placeholder:text-base placeholder:text-neutral-400 ' +
                            (error && !showCorrect
                              ? 'border-red-500 bg-red-900/20 text-white'
                              : !error && isCurrentAnswerCorrect
                                ? 'border-green-500 bg-green-900/20 text-white'
                                : 'border-[#64748b] bg-[#0b1120]/60 focus:border-blue-400 text-white')
                          }
                          style={{
                            width: '100%',
                            maxWidth: '380px',
                          }}
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

                      {/* когда showCorrect = true, правильный ответ уже в поле ввода */}
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
