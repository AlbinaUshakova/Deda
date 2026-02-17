// src/components/BlocksGame.tsx
'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import BlocksGrid from './BlocksGrid';
import { upsertProgress } from '@/lib/supabase';

type Word = { ge: string; ru: string; audio?: string };

type BlocksGameProps = {
  words: Word[];
  episodeId?: string;
  // рекорд уровня, который пришёл с карты
  initialBest?: number;
  topActions?: React.ReactNode;
};

type Question = {
  ge: string;
  ru: string;
};

type Mode = 'question' | 'pieces' | 'gameOver';
type AnswerState = 'idle' | 'wrong' | 'correct';

// ключи избранного — новый (общий с карточками) и старый (из BlocksGame)
const FAVORITES_KEY = 'deda_fav_ge';
const OLD_FAVORITES_KEY = 'deda_favorite_words';

function normalizeRu(str: string) {
  return str.trim().toLowerCase();
}

/**
 * Нормализация числовых форм
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

  if (/^\d+$/.test(str)) return normalizeDigitsToWords(str);

  const numVersion = normalizeWordsToDigits(str);
  if (numVersion !== str) return numVersion;

  return str;
}

// --- пытаемся распарсить числовую фразу в цифры (например "два" -> "2")
function parseNumberWordToDigits(str: string): string | null {
  const smallNumbers: Record<string, number> = {
    'ноль': 0, 'один': 1, 'два': 2, 'три': 3, 'четыре': 4, 'пять': 5,
    'шесть': 6, 'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10,
    'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13, 'четырнадцать': 14,
    'пятнадцать': 15, 'шестнадцать': 16, 'семнадцать': 17, 'восемнадцать': 18,
    'девятнадцать': 19, 'двадцать': 20, 'тридцать': 30, 'сорок': 40,
    'пятьдесят': 50, 'шестьдесят': 60, 'семьдесят': 70, 'восемьдесят': 80,
    'девяносто': 90, 'сто': 100, 'двести': 200, 'триста': 300, 'четыреста': 400,
    'пятьсот': 500, 'шестьсот': 600, 'семьсот': 700, 'восемьсот': 800,
    'девятьсот': 900, 'тысяча': 1000,
  };

  const words = str
    .toLowerCase()
    .replace(/[^а-яё\s-]/g, ' ')
    .replace(/-+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return null;

  let result = 0;
  let temp = 0;
  let matched = false;

  for (const w of words) {
    const val = smallNumbers[w];
    if (val === undefined) {
      // если встретили слово, которое не входит в числительные — прекращаем
      return null;
    }
    matched = true;

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
  if (!matched) return null;
  return String(result);
}

// нормализуем строку для сравнения: только буквы и цифры
function normalizeForCompare(str: string): string {
  const base = normalizeRu(str);
  // оставляем только буквы и цифры (любые юникод-буквы + числа)
  return base.replace(/[^\p{L}\p{N}]+/gu, '');
}

// сравнение ответов: сначала числовые формы, потом "только буквы/цифры"
function isSameAnswer(userInput: string, correctAnswer: string): boolean {
  const nu = normalizeRu(userInput);
  const nc = normalizeRu(correctAnswer);

  if (!nu) return false;

  // 1) числа: "два" == "2", "двадцать пять" == "25"
  const userNum =
    parseNumberWordToDigits(nu) ?? (/^\d+$/.test(nu) ? nu : null);
  const correctNum =
    parseNumberWordToDigits(nc) ?? (/^\d+$/.test(nc) ? nc : null);

  if (userNum && correctNum) {
    return userNum === correctNum;
  }

  // 2) сравниваем только буквы/цифры, игнорируя запятые, точки, пробелы и т.п.
  const cleanUser = normalizeForCompare(userInput);
  const cleanCorrect = normalizeForCompare(correctAnswer);

  return cleanUser === cleanCorrect;
}

/**
 * Строим один "цикл" слов
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

  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined;
}

export default function BlocksGame({
  words,
  episodeId,
  initialBest = 0,
  topActions,
}: BlocksGameProps) {
  const isFavoritesEpisode = episodeId === 'favorites';

  const hasWords = useMemo(() => words && words.length > 0, [words]);

  const [mode, setMode] = useState<Mode>('question');
  const [roundId, setRoundId] = useState(0);

  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');

  const [attempts, setAttempts] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);

  const [showPalette, setShowPalette] = useState(false);
  const [hardGameOver, setHardGameOver] = useState(false);

  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const [hardSet, setHardSet] = useState<Set<number>>(() => new Set());
  const [queue, setQueue] = useState<number[]>([]);

  // ожидание показа правильного ответа после 3-й ошибки
  const [isRevealing, setIsRevealing] = useState(false);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const correctTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ИЗБРАННЫЕ СЛОВА (по грузинскому слову)
  const [favoriteWords, setFavoriteWords] = useState<Set<string>>(
    () => new Set(),
  );

  const answerRef = useRef<HTMLTextAreaElement | null>(null);

  // рекорд уровня (тот же, что на карте)
  const [bestScore, setBestScore] = useState(initialBest);
  useEffect(() => {
    setBestScore(initialBest);
  }, [initialBest]);

  // helper: очистить таймер показа правильного ответа
  const clearRevealTimer = () => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    setIsRevealing(false);
  };

  const clearCorrectTimer = () => {
    if (correctTimeoutRef.current) {
      clearTimeout(correctTimeoutRef.current);
      correctTimeoutRef.current = null;
    }
  };

  // очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      clearRevealTimer();
      clearCorrectTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // загрузка избранных слов из localStorage (мерджим старый и новый ключ)
  useEffect(() => {
    try {
      const rawNew = window.localStorage.getItem(FAVORITES_KEY);
      const rawOld = window.localStorage.getItem(OLD_FAVORITES_KEY);

      const merged = new Set<string>();

      if (rawNew) {
        const arr: string[] = JSON.parse(rawNew);
        arr.forEach(ge => merged.add(ge));
      }

      if (rawOld) {
        const arrOld: string[] = JSON.parse(rawOld);
        arrOld.forEach(ge => merged.add(ge));
      }

      if (merged.size > 0) {
        setFavoriteWords(merged);
        // сразу сохраняем в новый ключ и можно забыть про старый
        window.localStorage.setItem(
          FAVORITES_KEY,
          JSON.stringify(Array.from(merged)),
        );
        window.localStorage.removeItem(OLD_FAVORITES_KEY);
      }
    } catch (e) {
      console.error('Failed to load favorites', e);
    }
  }, []);

  useEffect(() => {
    if (!answerRef.current) return;
    answerRef.current.style.height = 'auto';
    answerRef.current.style.height = `${Math.min(answerRef.current.scrollHeight, 180)}px`;
  }, [answer, showCorrect]);

  // переключение избранного для конкретного грузинского слова
  const toggleFavorite = (ge: string) => {
    setFavoriteWords(prev => {
      const next = new Set(prev);
      if (next.has(ge)) {
        next.delete(ge);
      } else {
        next.add(ge);
      }
      try {
        window.localStorage.setItem(
          FAVORITES_KEY,
          JSON.stringify(Array.from(next)),
        );
      } catch (e) {
        console.error('Failed to save favorites', e);
      }
      return next;
    });
  };

  const gotoNextFromQueue = (markHard: boolean) => {
    if (!hasWords) {
      setQuestion(null);
      setCurrentWordIndex(null);
      setQueue([]);
      return;
    }

    setHardSet(prevHard => {
      const newHard = new Set(prevHard);

      if (markHard && currentWordIndex !== null) {
        newHard.add(currentWordIndex);
      }

      setQueue(prevQueue => {
        let q = prevQueue;

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
        setAnswerState('idle');
        setAttempts(0);
        setShowCorrect(false);
        clearRevealTimer();

        return rest;
      });

      return newHard;
    });
  };

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
      setAnswerState('idle');
      setAttempts(0);
      setShowCorrect(false);
      clearRevealTimer();

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

  useEffect(() => {
    if (mode === 'pieces') {
      const t = setTimeout(() => setShowPalette(true), 400);
      return () => clearTimeout(t);
    }
    setShowPalette(false);
  }, [mode]);

  const isCurrentAnswerCorrect = useMemo(() => {
    if (!question) return false;
    return isSameAnswer(answer, question.ru);
  }, [answer, question]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== 'question' || !question || hardGameOver) return;

    // если уже ждём автопоказ правильного ответа — игнорируем ввод
    if (isRevealing) return;

    if (showCorrect) {
      gotoNextFromQueue(true);
      return;
    }

    if (!normalizeRu(answer)) return;

    const isCorrect = isSameAnswer(answer, question.ru);

    if (isCorrect) {
      clearRevealTimer();
      clearCorrectTimer();
      setError(false);
      setAnswerState('correct');
      setAttempts(0);
      setShowCorrect(false);
      correctTimeoutRef.current = setTimeout(() => {
        setAnswer('');
        setAnswerState('idle');
        setMode('pieces');
        setRoundId(prev => (prev > 0 ? prev + 1 : 1));
        correctTimeoutRef.current = null;
      }, 180);
    } else {
      setAnswerState('wrong');
      setAttempts(prev => {
        const next = prev + 1;

        if (next >= 3) {
          // третья ошибка — поле остаётся красным 4 секунды,
          // затем автоматически показываем правильный ответ
          if (!isRevealing && !showCorrect) {
            setError(true);
            setIsRevealing(true);

            revealTimeoutRef.current = setTimeout(() => {
              setShowCorrect(true);
              if (question) {
                setAnswer(question.ru);
              }
              setError(false);
              setAnswerState('idle');
              setIsRevealing(false);
              revealTimeoutRef.current = null;
            }, 2000);
          }
        } else {
          setError(true);
        }

        return next;
      });
    }
  };

  const handleSkipQuestion = () => {
    if (!hasWords || hardGameOver) return;
    gotoNextFromQueue(true);
  };

  const handleRoundFinished = () => {
    if (!hasWords) return;
    if (hardGameOver) return;

    setMode('question');
    setAnswerState('idle');
    gotoNextFromQueue(false);
  };

  const handleGameOver = () => {
    setMode('gameOver');
    setHardGameOver(true);
    // прогресс уже сохранён при обновлении рекорда
  };

  const handleRestartRequested = () => {
    setHardGameOver(false);
    setMode('question');
    setAnswerState('idle');
    setRoundId(0);
    gotoNextFromQueue(false);
  };

  // когда из BlocksGrid приходит новый рекорд — обновляем прогресс и карту
  const handleBestScoreChange = (newBest: number) => {
    setBestScore(newBest);
    if (!episodeId) return;
    upsertProgress(episodeId, newBest).catch(console.error);
  };

  const isQuestionVisible = mode === 'question';
  const isGameOver = mode === 'gameOver';
  const shouldRenderQuestionPanel = !isGameOver && !hardGameOver;

  // текущий флаг избранности для показываемого слова
  const currentGe = question?.ge ?? null;
  const isCurrentFavorite =
    currentGe != null ? favoriteWords.has(currentGe) : false;

  return (
    <div className="flex w-full justify-center -mt-3 md:-mt-4">
      <div className="flex w-full max-w-5xl items-start gap-4 md:gap-6 lg:gap-10 px-2 sm:px-4 md:px-6 py-4 md:py-6 lg:py-8">
        {/* ЛЕВАЯ ОБЛАСТЬ: задание / фигуры */}
        <div
          className="shrink-0 lg:ml-[-35px]"
          style={{ width: 'clamp(180px, 22vw, 260px)' }}
        >
          <div
            className="relative mt-8"
            style={{ height: 'min(72vh, 640px)' }}
          >
            {shouldRenderQuestionPanel && (
              <div
                className={
                  'absolute inset-0 transition-all duration-700 ' +
                  (isQuestionVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-16 pointer-events-none')
                }
              >
                <div className="flex flex-col items-start justify-start h-full px-2 pt-12">
                  {hasWords && question && (
                    <>
                      {/* строка с грузинским словом и кнопкой избранного */}
                      <div className="labelRow mb-6 flex items-center gap-2">
                        <div className="text-[clamp(1.35rem,2.2vw,2rem)] leading-tight">
                          {question.ge}
                        </div>

                        {!isFavoritesEpisode && (
                          <button
                            type="button"
                            onClick={() => toggleFavorite(question.ge)}
                            className={
                              'text-[clamp(1.35rem,2.2vw,2rem)] transition ' +
                              (isCurrentFavorite
                                ? 'text-yellow-300 hover:text-yellow-400'
                                : 'text-slate-400 hover:text-slate-200')
                            }
                            title={
                              isCurrentFavorite
                                ? 'Убрать из избранного'
                                : 'Добавить в избранное'
                            }
                          >
                            {isCurrentFavorite ? '★' : '☆'}
                          </button>
                        )}
                      </div>

                      <form onSubmit={handleSubmit} className="mb-2 w-full">
                        <textarea
                          ref={answerRef}
                          value={answer}
                          onChange={e => {
                            setAnswer(e.target.value);
                            if (error) setError(false);
                            if (answerState !== 'idle') setAnswerState('idle');
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              e.currentTarget.form?.requestSubmit();
                            }
                          }}
                          placeholder="введите перевод"
                          readOnly={showCorrect}
                          rows={1}
                          className={
                            'w-full min-h-[56px] max-h-[180px] resize-none overflow-y-auto px-4 py-3 rounded-xl border outline-none text-[clamp(1.1rem,1.8vw,1.65rem)] tracking-wide transition-all duration-200 placeholder:text-[clamp(1rem,1.5vw,1.4rem)] placeholder:text-neutral-400 ' +
                            (answerState === 'wrong' && !showCorrect
                              ? 'border-red-400 bg-red-700/10 text-white'
                              : answerState === 'correct' || (!error && isCurrentAnswerCorrect)
                                ? 'border-green-300 bg-green-400/5 text-white'
                                : 'border-transparent bg-[#0b1120]/60 focus:border-transparent focus:shadow-none text-white')
                          }
                        />
                      </form>

                      <button
                        type="button"
                        onClick={handleSkipQuestion}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-sm text-neutral-300 opacity-70 transition-all duration-150 hover:opacity-100 hover:bg-white/[0.05] hover:text-white"
                        disabled={showCorrect}
                      >
                        <span className="text-lg">↻</span>
                        <span>Обновить</span>
                      </button>

                      {error && !showCorrect && (
                        <div className="mt-2 text-xs text-red-400">
                          {attempts >= 3
                            ? 'Неверно, сейчас покажем верный ответ.'
                            : 'Неверно, попробуй ещё раз.'}
                        </div>
                      )}
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

            <div
              id="blocks-palette-slot"
              className={
                'absolute inset-0 flex items-center justify-center transition-opacity duration-300 ' +
                (showPalette ? 'opacity-100' : 'opacity-0 pointer-events-none')
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
            initialBestScore={bestScore}
            onBestScoreChange={handleBestScoreChange}
            topActions={topActions}
          />
        </div>
      </div>
    </div>
  );
}
