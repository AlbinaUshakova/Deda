import { NextResponse } from 'next/server';
import { listEpisodes, loadNewLettersPerEpisode } from '@/lib/content';

export async function GET() {
  try {
    const [episodes, lettersByEpisode] = await Promise.all([
      listEpisodes(),
      loadNewLettersPerEpisode(),
    ]);

    return NextResponse.json({
      ok: true,
      episodes,
      lettersByEpisode,
    });
  } catch (error) {
    console.error('content episodes error', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load episodes' },
      { status: 500 },
    );
  }
}
