// src/components/BlocksGame.tsx
'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import BlocksGrid from './BlocksGrid';
import { upsertProgress } from '@/lib/supabase';
import { getSettings } from '@/lib/settings';

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
type LetterCellState = 'correct' | 'present' | 'absent';
type TranslationDirection = 'ge-ru' | 'ru-ge';
const RECENT_WORD_GAP = 4;

// ключи избранного — новый (общий с карточками) и старый (из BlocksGame)
const FAVORITES_KEY = 'deda_fav_ge';
const OLD_FAVORITES_KEY = 'deda_favorite_words';

function normalizeRu(str: string) {
  return str.trim().toLowerCase().replace(/ё/g, 'е');
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

function tokenizeAnswerCells(str: string): string[] {
  return Array.from(normalizeRu(str).replace(/[^\p{L}\p{N}]+/gu, ''));
}

function evaluateLetterCells(
  guessRaw: string,
  solutionRaw: string,
): Array<{ char: string; state: LetterCellState }> {
  const guess = tokenizeAnswerCells(guessRaw);
  const solution = tokenizeAnswerCells(solutionRaw);
  if (!guess.length || !solution.length) return [];

  const states: LetterCellState[] = Array(guess.length).fill('absent');
  const remaining = new Map<string, number>();
  const overlapLen = Math.min(guess.length, solution.length);

  // 1) точные совпадения позиции
  for (let i = 0; i < overlapLen; i += 1) {
    if (guess[i] === solution[i]) {
      states[i] = 'correct';
    } else {
      const ch = solution[i];
      remaining.set(ch, (remaining.get(ch) ?? 0) + 1);
    }
  }
  for (let i = overlapLen; i < solution.length; i += 1) {
    const ch = solution[i];
    remaining.set(ch, (remaining.get(ch) ?? 0) + 1);
  }

  // 2) есть в ответе, но в другой позиции
  for (let i = 0; i < guess.length; i += 1) {
    if (states[i] === 'correct') continue;
    const ch = guess[i];
    const cnt = remaining.get(ch) ?? 0;
    if (cnt > 0) {
      states[i] = 'present';
      remaining.set(ch, cnt - 1);
    }
  }

  return guess.map((char, i) => ({ char, state: states[i] }));
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

function wordKey(word: Word): string {
  return `${normalizeRu(word.ge)}|${normalizeRu(word.ru)}`;
}

function pickNextIndexFromQueue(
  queue: number[],
  words: Word[],
  recentIndices: number[],
  recentKeys: string[],
): { nextIdx: number; rest: number[] } | null {
  if (!queue.length) return null;

  const recentWindow = Math.max(1, Math.min(RECENT_WORD_GAP, words.length - 1));
  const recentIdxSet = new Set(recentIndices.slice(-recentWindow));
  const recentKeySet = new Set(recentKeys.slice(-recentWindow));
  const lastKey = recentKeys[recentKeys.length - 1] ?? null;

  let pickPos = queue.findIndex(idx => {
    const w = words[idx];
    if (!w) return false;
    if (recentIdxSet.has(idx)) return false;
    if (recentKeySet.has(wordKey(w))) return false;
    return true;
  });

  // fallback: выбираем наименее конфликтный вариант
  // и отдельно стараемся никогда не давать тот же ключ подряд
  if (pickPos === -1) {
    if (lastKey) {
      const nonSameAsLast = queue.findIndex(idx => {
        const w = words[idx];
        return !!w && wordKey(w) !== lastKey;
      });
      if (nonSameAsLast !== -1) {
        pickPos = nonSameAsLast;
      }
    }

    if (pickPos === -1) {
      let bestPos = 0;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < queue.length; i += 1) {
        const idx = queue[i];
        const w = words[idx];
        if (!w) continue;
        const key = wordKey(w);
        let score = 0;
        if (!recentIdxSet.has(idx)) score += 2;
        if (!recentKeySet.has(key)) score += 3;
        if (lastKey && key !== lastKey) score += 4;
        if (score > bestScore) {
          bestScore = score;
          bestPos = i;
        }
      }
      pickPos = bestPos;
    }
  }

  const nextIdx = queue[pickPos];
  const rest = [...queue.slice(0, pickPos), ...queue.slice(pickPos + 1)];
  return { nextIdx, rest };
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
  const [direction, setDirection] = useState<TranslationDirection>(() => {
    if (typeof window === 'undefined') return getSettings().translationDirection;
    return getSettings().translationDirection;
  });

  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [isAnswerFocused, setIsAnswerFocused] = useState(false);

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
  const answerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const recentWordIndicesRef = useRef<number[]>([]);
  const recentWordKeysRef = useRef<string[]>([]);

  // ИЗБРАННЫЕ СЛОВА (по грузинскому слову)
  const [favoriteWords, setFavoriteWords] = useState<Set<string>>(
    () => new Set(),
  );
  const [isNarrowLayout, setIsNarrowLayout] = useState(false);


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

  const resizeAnswerInput = () => {
    const el = answerInputRef.current;
    if (!el) return;

    el.style.height = 'auto';
    const cs = window.getComputedStyle(el);
    const lineHeight = parseFloat(cs.lineHeight || '22');
    const paddingTop = parseFloat(cs.paddingTop || '0');
    const paddingBottom = parseFloat(cs.paddingBottom || '0');
    const maxHeight = lineHeight * 2 + paddingTop + paddingBottom;
    const nextHeight = Math.min(el.scrollHeight, maxHeight);

    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
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

  const answerFontPx = useMemo(() => {
    const len = Array.from(answer ?? '').length;
    if (len <= 12) return 24;
    if (len <= 20) return 21;
    if (len <= 30) return 18;
    if (len <= 45) return 15;
    return 13;
  }, [answer]);

  useEffect(() => {
    const syncDirectionFromSettings = () => {
      const next = getSettings().translationDirection;
      setDirection(prev => (prev === next ? prev : next));
    };

    syncDirectionFromSettings();
    window.addEventListener('deda:settings-updated', syncDirectionFromSettings as EventListener);
    return () => {
      window.removeEventListener('deda:settings-updated', syncDirectionFromSettings as EventListener);
    };
  }, []);

  useEffect(() => {
    const updateLayout = () => {
      setIsNarrowLayout(window.innerWidth < 1024);
    };
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  useEffect(() => {
    setAnswer('');
    setError(false);
    setAnswerState('idle');
    setAttempts(0);
    setShowCorrect(false);
    clearRevealTimer();
    if (mode === 'question' && hasWords) {
      gotoNextFromQueue(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  useEffect(() => {
    resizeAnswerInput();
  }, [answer, answerFontPx]);

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

  const rememberRecentWord = (idx: number) => {
    const w = words[idx];
    if (!w) return;
    const key = wordKey(w);
    const maxRecent = Math.max(3, RECENT_WORD_GAP * 2);

    recentWordIndicesRef.current = [...recentWordIndicesRef.current, idx].slice(
      -maxRecent,
    );
    recentWordKeysRef.current = [...recentWordKeysRef.current, key].slice(
      -maxRecent,
    );
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

        const picked = pickNextIndexFromQueue(
          q,
          words,
          recentWordIndicesRef.current,
          recentWordKeysRef.current,
        );
        if (!picked) {
          setQuestion(null);
          setCurrentWordIndex(null);
          return [];
        }
        const { nextIdx, rest } = picked;
        const w = words[nextIdx];

        setCurrentWordIndex(nextIdx);
        rememberRecentWord(nextIdx);
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
      recentWordIndicesRef.current = [];
      recentWordKeysRef.current = [];
      const newHard = new Set<number>();
      const cycle = buildCycle(words.length, newHard);

      if (!cycle.length) {
        setQuestion(null);
        setQueue([]);
        setCurrentWordIndex(null);
        setHardSet(newHard);
        return;
      }

      const picked = pickNextIndexFromQueue(
        cycle,
        words,
        recentWordIndicesRef.current,
        recentWordKeysRef.current,
      );
      if (!picked) {
        setQuestion(null);
        setQueue([]);
        setCurrentWordIndex(null);
        setHardSet(newHard);
        return;
      }

      const { nextIdx: firstIdx, rest } = picked;
      const w = words[firstIdx];

      setCurrentWordIndex(firstIdx);
      rememberRecentWord(firstIdx);
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
    const correctAnswer = direction === 'ge-ru' ? question.ru : question.ge;
    return isSameAnswer(answer, correctAnswer);
  }, [answer, question, direction]);

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

    const correctAnswer = direction === 'ge-ru' ? question.ru : question.ge;
    const isCorrect = isSameAnswer(answer, correctAnswer);

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
      if (currentWordIndex !== null) {
        setHardSet(prev => {
          const next = new Set(prev);
          next.add(currentWordIndex);
          return next;
        });
      }
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
                setAnswer(correctAnswer);
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
  const showQuestionStage = !isNarrowLayout || (shouldRenderQuestionPanel && isQuestionVisible);
  const showBoardStage = !isNarrowLayout || !isQuestionVisible;
  const paletteSlotId = isNarrowLayout ? 'blocks-palette-slot-mobile' : 'blocks-palette-slot';

  // текущий флаг избранности для показываемого слова
  const currentGe = question?.ge ?? null;
  const isCurrentFavorite =
    currentGe != null ? favoriteWords.has(currentGe) : false;
  const promptText = question
    ? (direction === 'ge-ru' ? question.ge : question.ru)
    : '';
  const inputPlaceholder = 'Введите ответ';
  const isAnswerRowActive =
    mode === 'question' &&
    !showCorrect &&
    (isAnswerFocused || normalizeRu(answer).length > 0);
  const currentCorrectAnswer = question
    ? (direction === 'ge-ru' ? question.ru : question.ge)
    : '';
  const answerCells = useMemo(() => {
    if (!question || !normalizeRu(answer) || showCorrect) return [];
    return evaluateLetterCells(answer, currentCorrectAnswer);
  }, [answer, currentCorrectAnswer, question, showCorrect]);

  return (
    <div className="flex w-full justify-center -mt-3 md:-mt-4">
      <div
        className={
          'relative flex w-full max-w-5xl rounded-[28px] bg-transparent px-1 sm:px-3 md:px-6 py-3 md:py-5 lg:py-7 ' +
          (isNarrowLayout
            ? 'flex-col items-center gap-3'
            : 'flex-row items-start gap-2 sm:gap-4 md:gap-6 lg:gap-8')
        }
      >
        {/* ЛЕВАЯ ОБЛАСТЬ: задание / фигуры */}
        <div
          className={
            (isNarrowLayout
              ? 'w-full max-w-[420px] shrink-0 ml-0'
              : 'w-[clamp(220px,33vw,390px)] shrink-0 ml-0 md:ml-[-10px] lg:ml-[-18px]') +
            (showQuestionStage ? '' : ' hidden')
          }
        >
          <div
            className="relative mt-0"
            style={{ height: isNarrowLayout ? 'auto' : 'min(67dvh, 620px)' }}
          >
            {shouldRenderQuestionPanel && (
              <div
                className={
                  (isNarrowLayout ? 'relative' : 'absolute inset-0 ') +
                  'transition-all duration-700 ' +
                  (isQuestionVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-16 pointer-events-none')
                }
              >
                <div className="flex flex-col items-start justify-start h-full px-2 pt-5">
                  {hasWords && question && (
                    <div className="w-full lg:translate-x-3 rounded-3xl bg-transparent p-2.5 sm:p-3 md:p-4">
                      {/* строка с грузинским словом и кнопкой избранного */}
                      <div className="labelRow mb-3 sm:mb-4 md:mb-5 flex items-center gap-2">
                        <div
                          className="max-w-full break-words overflow-visible text-slate-700 font-normal tracking-[-0.01em] text-[clamp(22px,2.5vw,34px)] leading-[1.22]"
                          style={{
                            overflowWrap: 'break-word',
                            wordBreak: 'normal',
                          }}
                        >
                          {promptText}
                        </div>
                      </div>

                      <div
                        className={`-mt-2 mb-2 w-full rounded-2xl transition-all duration-200 ${
                          isAnswerRowActive
                            ? 'bg-indigo-50/35 shadow-[0_6px_14px_rgba(99,102,241,0.1)]'
                            : 'bg-transparent'
                        }`}
                      >
                        <form onSubmit={handleSubmit} className="w-full md:-mt-0.5">
                          <textarea
                            ref={answerInputRef}
                            value={answer}
                            onChange={e => {
                              const nextValue = e.target.value;
                              setAnswer(nextValue);
                              if (error) setError(false);
                              if (!question || showCorrect) {
                                if (answerState !== 'idle') setAnswerState('idle');
                                return;
                              }
                              if (!normalizeRu(nextValue)) {
                                if (answerState !== 'idle') setAnswerState('idle');
                                return;
                              }
                              const correctAnswer = direction === 'ge-ru' ? question.ru : question.ge;
                              const liveCorrect = isSameAnswer(nextValue, correctAnswer);
                              setAnswerState(liveCorrect ? 'correct' : 'idle');
                              requestAnimationFrame(resizeAnswerInput);
                            }}
                            onFocus={() => setIsAnswerFocused(true)}
                            onBlur={() => setIsAnswerFocused(false)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.currentTarget.form?.requestSubmit();
                              }
                            }}
                            placeholder={inputPlaceholder}
                            readOnly={showCorrect}
                            autoComplete="off"
                            spellCheck={false}
                            rows={1}
                            className={
                              'blocks-answer-input w-full min-h-[clamp(56px,7.5vh,84px)] max-h-[clamp(96px,14vh,132px)] px-[clamp(14px,2.4vw,26px)] py-[clamp(9px,1.3vw,14px)] rounded-2xl border-2 border-transparent outline-none tracking-[-0.01em] leading-[1.2] resize-none overflow-hidden transition-all duration-200 placeholder:font-semibold placeholder:text-[#8892b0] placeholder:text-[clamp(16px,2.1vw,28px)] focus:ring-0 focus:shadow-none ' +
                              (answerState === 'wrong' && !showCorrect
                                ? 'animate-input-shake bg-red-50/85 text-slate-800'
                                : answerState === 'correct'
                                  ? 'bg-white/70 text-slate-800 shadow-none'
                                  : 'bg-white/70 text-slate-800 shadow-none')
                            }
                            style={{ fontSize: `${Math.max(16, answerFontPx)}px` }}
                          />
                        </form>
                      </div>

                      <div className="mt-2 inline-flex w-full items-center gap-[clamp(6px,1.1vw,12px)] flex-wrap">
                        <button
                          type="button"
                          onClick={handleSkipQuestion}
                          className="inline-flex h-[clamp(36px,5vh,48px)] items-center gap-2 rounded-lg border border-transparent bg-transparent px-[clamp(6px,1.2vw,10px)] text-[clamp(17px,2.1vw,24px)] font-medium text-[#556182] transition-all duration-150 hover:bg-slate-100/60 hover:text-[#3f4967]"
                          disabled={showCorrect}
                        >
                          <span className="inline-block -translate-y-[3px] text-[clamp(24px,3.1vw,34px)] leading-none font-normal">⟳</span>
                          <span className="leading-none">Обновить</span>
                        </button>
                        {!isFavoritesEpisode && (
                          <button
                            type="button"
                            onClick={() => toggleFavorite(question.ge)}
                            className={
                              'h-[clamp(36px,5vh,48px)] w-[clamp(36px,5vh,48px)] inline-flex shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-[clamp(22px,2.8vw,30px)] transition-all duration-150 ' +
                              (isCurrentFavorite
                                ? 'text-amber-500 hover:text-amber-600'
                                : 'text-slate-400 hover:text-slate-600')
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

                      {error && !showCorrect && (
                        <div className="mt-2 text-[13px] text-red-500">
                          {attempts >= 3
                            ? 'Неверно, сейчас покажем верный ответ.'
                            : 'Неверно, попробуй ещё раз.'}
                        </div>
                      )}
                    </div>
                  )}

                  {!hasWords && (
                    <div className="text-sm text-slate-500">
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
        <div
          className={
            'min-w-0 flex flex-col items-center ' +
            (isNarrowLayout
              ? 'w-full max-w-[540px]'
              : 'flex-1 justify-center lg:justify-start ml-0 lg:ml-1 xl:ml-2 -mt-2 md:-mt-4 lg:-mt-6') +
            (showBoardStage ? '' : ' hidden')
          }
        >
          <BlocksGrid
            roundId={roundId}
            onRoundFinished={handleRoundFinished}
            onRestartRequested={handleRestartRequested}
            onGameOver={handleGameOver}
            initialBestScore={bestScore}
            onBestScoreChange={handleBestScoreChange}
            topActions={topActions}
            answerState={answerState}
            paletteSlotId={paletteSlotId}
            palettePlacement={isNarrowLayout ? 'bottom' : 'side'}
          />
          <div
            id="blocks-palette-slot-mobile"
            className={
              (isNarrowLayout ? 'flex' : 'hidden') +
              ' w-full min-h-[clamp(82px,15vh,140px)] items-center justify-center'
            }
          />
        </div>
      </div>
    </div>
  );
}
