import { NextRequest, NextResponse } from 'next/server';

type RateEntry = { count: number; resetAt: number };

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;
const rateMap = new Map<string, RateEntry>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  return realIp || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const current = rateMap.get(ip);

  if (!current || now > current.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (current.count >= RATE_LIMIT) {
    return true;
  }

  current.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests' },
      { status: 429 },
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const feedbackTo = process.env.FEEDBACK_TO_EMAIL;
  const feedbackFrom = process.env.FEEDBACK_FROM_EMAIL;

  if (!resendApiKey || !feedbackTo || !feedbackFrom) {
    return NextResponse.json(
      { ok: false, error: 'Email is not configured' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
      { status: 400 },
    );
  }

  const messageRaw = (body as { message?: unknown })?.message;
  const contactRaw = (body as { contact?: unknown })?.contact;

  const message = typeof messageRaw === 'string' ? messageRaw.trim() : '';
  const contact = typeof contactRaw === 'string' ? contactRaw.trim() : '';

  if (message.length < 5 || message.length > 2000 || contact.length > 200) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed' },
      { status: 400 },
    );
  }

  const text = [
    'Новый отзыв из Deda',
    '',
    `Сообщение: ${message}`,
    `Контакт: ${contact || 'не указан'}`,
    `IP: ${ip}`,
    `Время: ${new Date().toISOString()}`,
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: feedbackFrom,
      to: [feedbackTo],
      subject: 'Deda feedback',
      text,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    console.error('Resend send error', response.status, details);
    return NextResponse.json(
      { ok: false, error: 'Send failed' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
