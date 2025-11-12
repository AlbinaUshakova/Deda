// app/study/[episodeId]/page.tsx
import { loadEpisode } from '@/lib/content';
import StudyClient from './StudyClient';

export default async function Page({ params }: { params: { episodeId: string } }) {
  const ep = await loadEpisode(params.episodeId);
  return <StudyClient episodeId={params.episodeId} bundled={ep} />;
}
