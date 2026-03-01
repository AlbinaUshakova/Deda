import { NextResponse } from 'next/server';
import { listEpisodes, loadNewLettersPerEpisode } from '@/lib/content';

export const dynamic = 'force-dynamic';

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
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('content episodes error', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load episodes' },
      { status: 500 },
    );
  }
}
