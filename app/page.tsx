import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

const landingTitle = 'Deda — учимся читать по-грузински через игру';
const landingDescription =
  'Учимся читать по-грузински, играя. Слушай буквы, читай карточки и закрепляй чтение в игре.';

export const metadata: Metadata = {
  metadataBase: new URL('https://deda-game.vercel.app'),
  title: landingTitle,
  description: landingDescription,
  openGraph: {
    title: landingTitle,
    description: landingDescription,
    url: 'https://deda-game.vercel.app/',
    siteName: 'Deda',
    type: 'website',
    images: [
      {
        url: '/landing/deda-new-screen-7.png',
        width: 1015,
        height: 699,
        alt: 'Deda — учимся читать по-грузински',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: landingTitle,
    description: landingDescription,
    images: ['/landing/deda-new-screen-7.png'],
  },
};

export default function Page() {
  redirect('/landing');
}
