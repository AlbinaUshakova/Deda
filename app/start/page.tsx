import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

const landingTitle = 'Deda — учимся читать по-грузински через игру';
const landingDescription =
  'Учимся читать по-грузински, играя. Слушай буквы, читай карточки и закрепляй чтение в игре.';

export const metadata: Metadata = {
  title: landingTitle,
  description: landingDescription,
  openGraph: {
    title: landingTitle,
    description: landingDescription,
    url: 'https://deda-game.vercel.app/start',
    siteName: 'Deda',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: landingTitle,
    description: landingDescription,
  },
};

export default function StartPage() {
  redirect('/landing');
}
