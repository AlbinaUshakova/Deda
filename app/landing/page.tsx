import Image from 'next/image';
import LandingAlphabet from '@/components/LandingAlphabet';

const lightInterfaceSlots: Array<{
  title: string;
  description: string;
  src: string;
  cropFrame?: boolean;
  mobileContain?: boolean;
}> = [
  {
    title: 'Скрин 7',
    description: 'Новый экран',
    src: '/landing/deda-light-screen-panel.png',
  },
  {
    title: 'Светлая карточка',
    description: 'Светлый экран карточек',
    src: '/landing/deda-light-card-batumi.png',
  },
  {
    title: 'Светлая игра',
    description: 'Светлый экран игры с вводом слова',
    src: '/landing/deda-mar19-screen-7.png',
  },
  {
    title: 'Светлые фигуры',
    description: 'Светлый экран игры с фигурами',
    src: '/landing/deda-mar19-screen-6.png',
  },
];

const darkInterfaceSlots: Array<{
  title: string;
  description: string;
  src: string;
  cropFrame?: boolean;
  mobileContain?: boolean;
}> = [
  {
    title: 'Тёмные уроки 1',
    description: 'Тёмный экран уроков',
    src: '/landing/deda-dark-screen-panel-2.png',
  },
  {
    title: 'Тёмная карточка',
    description: 'Тёмный экран карточек',
    src: '/landing/deda-mar19-screen-2.png',
  },
  {
    title: 'Скрин 2',
    description: 'Тёмный экран игры',
    src: '/landing/deda-mar19-screen-4.png',
  },
  {
    title: 'Скрин 4',
    description: 'Тёмный экран игры',
    src: '/landing/deda-mar19-screen-3.png',
  },
];

export const metadata = {
  title: 'Deda - учимся читать по-грузински, играя.',
  description:
    'Слушай буквы, читай карточки и закрепляй чтение в игре.',
};

export default function LandingPage() {
  const landingStyles = `
    .header-control-btn--alphabet {
      display: none !important;
    }

    .landing-shell {
      overflow-x: clip;
    }

    .landing-hero-grid {
      align-items: start;
      gap: clamp(28px, 5vw, 72px);
    }

    .landing-copy {
      max-width: min(100%, 620px);
    }

    .landing-copy p {
      text-wrap: balance;
    }

    .landing-subtitle {
      max-width: 560px;
      text-wrap: balance;
    }

    .landing-alphabet-hint {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      padding-left: 18px;
      max-width: 680px;
      font-size: 14px;
      line-height: 1.42;
      color: var(--text-secondary);
      letter-spacing: -0.01em;
      text-align: center;
    }

    .landing-alphabet-hint::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      transform: translateY(-50%);
      background: var(--accent);
      box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.28);
      animation: landingHintPulse 1.4s ease-in-out infinite;
    }

    .landing-alphabet-hint strong {
      color: inherit;
      font-weight: 500;
    }

    .landing-list-arrow {
      display: inline-flex;
      margin-left: 8px;
      color: var(--accent);
      font-size: 20px;
      line-height: 1;
      animation: landingHintNudge 1.1s ease-in-out infinite;
      transform-origin: left center;
      will-change: transform, opacity;
    }

    @keyframes landingHintNudge {
      0%, 100% {
        transform: translateX(0);
        opacity: 0.65;
      }
      50% {
        transform: translateX(7px);
        opacity: 1;
      }
    }

    @keyframes landingHintPulse {
      0%, 100% {
        opacity: 0.75;
        box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.12);
      }
      50% {
        opacity: 1;
        box-shadow: 0 0 0 6px rgba(249, 115, 22, 0.02);
      }
    }

    .landing-alpha-card {
      position: relative;
      width: 100%;
      max-width: clamp(290px, 31vw, 440px);
      margin-inline: auto;
    }

    .landing-alpha-cat {
      position: absolute;
      right: 10px;
      bottom: -88px;
      pointer-events: none;
    }

    .landing-screens-grid {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: max-content;
      gap: 16px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      overscroll-behavior-x: contain;
      padding: 0 2px 14px;
      scrollbar-width: thin;
      -webkit-overflow-scrolling: touch;
    }

    .landing-screens-grid--dark {
      display: none;
    }

    .landing-screen-item {
      width: fit-content;
      scroll-snap-align: start;
      scroll-snap-stop: always;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid rgba(148, 163, 184, 0.34);
      background: transparent;
      box-shadow: none;
    }

    .landing-screen-item--crop-frame {
      width: min(78vw, 360px);
      max-height: min(50vh, 520px);
    }

    .landing-screen-media {
      width: min(84vw, 404px);
      max-width: min(84vw, 404px);
      height: auto;
      max-height: min(32vh, 258px);
      display: block;
      object-fit: cover;
      object-position: top center;
    }

    .landing-screen-item--crop-frame .landing-screen-media {
      width: 100%;
      height: min(50vh, 520px);
      max-width: none;
      object-fit: cover;
      object-position: 64% 54%;
      transform: scale(1.2);
      transform-origin: center center;
    }

    .landing-swipe-hint {
      display: none;
      margin-top: 6px;
      font-size: 12px;
      color: var(--text-secondary);
      letter-spacing: -0.01em;
    }

    .landing-stat-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 160px));
      gap: 14px;
    }

    .landing-cta-btn {
      width: fit-content;
      min-width: 154px;
    }

    .landing-cta-row {
      display: inline-flex;
      align-items: flex-end;
      flex-wrap: nowrap;
      gap: 2px;
    }

    .landing-cta-cat {
      flex: 0 0 auto;
      transform: translateY(24px);
    }

    html[data-theme='dark'] .landing-shell {
      background: var(--app-bg);
    }

    html[data-theme='dark'] .landing-title {
      color: rgba(249, 247, 242, 0.97);
    }

    html[data-theme='dark'] .landing-subtitle,
    html[data-theme='dark'] .landing-alphabet-hint {
      color: rgba(224, 216, 206, 0.82);
    }

    html[data-theme='dark'] .landing-alphabet-hint::before {
      background: rgba(251, 146, 60, 0.82);
      box-shadow: 0 0 0 0 rgba(251, 146, 60, 0.18);
    }

    html[data-theme='dark'] .landing-screen-item {
      border-color: rgba(148, 163, 184, 0.22);
      background: rgba(30, 32, 38, 0.34);
      box-shadow: 0 10px 24px rgba(2, 6, 23, 0.14);
    }

    html[data-theme='dark'] .landing-screens-grid--light {
      display: none;
    }

    html[data-theme='dark'] .landing-screens-grid--dark {
      display: grid;
    }

    html[data-theme='dark'] .landing-cta-btn {
      box-shadow: 0 8px 16px rgba(249, 115, 22, 0.1);
    }

    html[data-theme='dark'] .landing-screens-grid {
      filter: saturate(0.96) contrast(1.03);
    }

    html[data-theme='dark'] .landing-screens-grid + .landing-screens-grid {
      filter: saturate(0.98) contrast(1.04);
    }

    html[data-theme='dark'] .landing-showcase-section {
      margin-top: 12px;
    }

    html[data-theme='dark'] .landing-showcase-title {
      color: rgba(238, 232, 224, 0.88);
    }

    @media (min-width: 768px) {
      .landing-hero-grid {
        gap: clamp(18px, 3vw, 36px);
        grid-template-columns: minmax(0, 1.08fr) minmax(250px, 0.92fr);
      }
    }

    @media (min-width: 1024px) {
      .landing-hero-grid {
        gap: clamp(16px, 2.2vw, 28px);
        grid-template-columns: minmax(0, 1.04fr) minmax(300px, 0.96fr);
      }
    }

    @media (min-width: 1280px) {
      .landing-hero-grid {
        gap: clamp(18px, 2.4vw, 34px);
        grid-template-columns: minmax(0, 1fr) minmax(340px, 430px);
      }

      .landing-screens-grid {
        grid-auto-columns: max-content;
      }
    }

    @media (min-width: 1600px) {
      .landing-hero-grid {
        gap: clamp(28px, 3vw, 48px);
        grid-template-columns: minmax(0, 1fr) minmax(420px, 520px);
      }

      .landing-alpha-card {
        max-width: 500px;
      }
    }

    @media (max-width: 767px) {
      .landing-hero-grid {
        justify-items: center;
      }

      .landing-copy {
        max-width: 720px;
      }

      .landing-alphabet-hint {
        max-width: 100%;
        font-size: 15px;
        color: color-mix(in srgb, var(--text-primary) 72%, white 28%);
      }

      .landing-alpha-card {
        max-width: min(100%, 520px);
      }

      .landing-alpha-cat {
        right: 8px;
        bottom: -66px;
      }

      .landing-screens-grid {
        grid-auto-columns: max-content;
      }
    }

    @media (max-width: 767px) {
      .landing-shell {
        overflow-x: hidden;
      }

      .landing-copy {
        max-width: 100%;
        text-align: center;
      }

      .landing-alphabet-hint {
        max-width: min(100%, 360px);
        justify-content: center;
        padding: 10px 14px;
        border-radius: 18px;
        background: transparent;
        box-shadow: none;
        font-size: 14px;
        line-height: 1.4;
      }

      .landing-alpha-card {
        max-width: min(100%, 392px);
      }

      .landing-alpha-cat {
        display: none;
      }

      .landing-stat-grid {
        grid-template-columns: 1fr;
      }

      .landing-cta-btn {
        width: 100%;
        min-width: 0;
      }

      .landing-cta-row {
        display: flex;
        width: 100%;
        justify-content: center;
        align-items: flex-end;
        flex-wrap: nowrap;
        gap: 3px;
      }

      .landing-cta-cat {
        margin-right: -6px;
        transform: translateY(24px);
      }

      .landing-screens-grid {
        grid-auto-columns: max-content;
        gap: 8px;
        padding-bottom: 4px;
        overflow-x: auto;
        overflow-y: hidden;
        padding-inline: 6px;
        scrollbar-width: none;
        scroll-padding-inline: 6px;
        scroll-snap-type: x proximity;
      }

      .landing-screens-grid::-webkit-scrollbar {
        display: none;
      }

      .landing-screen-item {
        width: min(78vw, 296px);
        border-color: rgba(148, 163, 184, 0.22);
        background: rgba(255, 255, 255, 0.6);
        box-shadow: none;
      }

      html[data-theme='dark'] .landing-screen-item {
        border-color: rgba(148, 163, 184, 0.2);
        background: rgba(31, 34, 40, 0.3);
        box-shadow: none;
      }

      .landing-screen-media {
        width: 100%;
        max-width: none;
        height: auto;
        max-height: min(29vh, 214px);
      }

      .landing-screen-item {
        scroll-snap-align: center;
      }

      .landing-screen-item--crop-frame {
        width: min(78vw, 286px);
        max-height: min(42vh, 360px);
      }

      .landing-screen-item--crop-frame .landing-screen-media {
        width: 100%;
        height: min(42vh, 360px);
      }

      .landing-screen-media--contain-mobile {
        object-fit: contain;
        object-position: center top;
      }

      .landing-swipe-hint {
        display: block;
        margin-top: 8px;
      }

      .landing-screen-item:nth-child(n + 5) {
        display: none;
      }

      .landing-method-section {
        display: none;
      }

      .landing-screens-grid {
        margin-top: 20px;
      }
    }

    @media (max-width: 479px) {
      .landing-hero-grid {
        gap: 18px;
      }

      .landing-alphabet-hint {
        font-size: 12px;
        line-height: 1.45;
      }

      .landing-alpha-card {
        max-width: 100%;
      }
    }

    @media (display-mode: standalone) and (max-width: 767px) {
      .landing-screens-grid {
        grid-auto-columns: 296px;
        scroll-snap-type: none;
        scroll-padding-inline: 0;
      }

      .landing-screen-item {
        width: 296px;
      }

      .landing-screen-item--crop-frame {
        width: 286px;
      }
    }

    @media (max-width: 767px) {
      html[data-standalone='true'] .landing-screens-grid {
        grid-auto-columns: 296px;
        scroll-snap-type: none;
        scroll-padding-inline: 0;
      }

      html[data-standalone='true'] .landing-screen-item {
        width: 296px;
      }

      html[data-standalone='true'] .landing-screen-item--crop-frame {
        width: 286px;
      }
    }
  `;

  return (
    <main className="landing-shell min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <style dangerouslySetInnerHTML={{ __html: landingStyles }} />
      <section className="mx-auto flex w-full max-w-[1240px] flex-col justify-center px-4 pt-12 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="landing-hero-grid grid grid-cols-1 md:grid-cols-[minmax(0,1.08fr)_minmax(250px,0.92fr)]">
          <div className="landing-copy max-w-none md:col-start-1 md:row-start-1">
            <h1 className="landing-title max-w-[620px] text-[clamp(23px,3.8vw,47px)] font-semibold leading-[1.02] tracking-[-0.02em]">
              Учимся читать
              <br />
              по-грузински, играя
            </h1>
            <p className="landing-subtitle mt-6 text-[clamp(15px,2vw,20px)] leading-[1.4] text-[var(--text-secondary)]">
              Слушай буквы, читай карточки
              <br />
              и закрепляй чтение в игре.
            </p>
            <div className="landing-cta-row mt-3">
              <Image
                src="/images/deda-cat.png"
                alt="Deda cat"
                width={136}
                height={136}
                priority
                className="landing-cta-cat h-auto w-[114px] shrink-0 object-contain drop-shadow-[0_8px_18px_rgba(15,23,42,0.08)] sm:w-[128px] lg:w-[150px]"
              />
              <a
                href="/lessons"
                className="landing-cta-btn inline-flex h-[54px] items-center justify-center rounded-2xl border border-[var(--accent)] bg-[var(--accent)] px-[14px] text-[18px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Начать читать
              </a>
            </div>
          </div>

          <div className="relative mt-12 w-full max-w-[458px] md:col-start-2 md:row-span-2 md:row-start-1 md:mt-8 md:-ml-[52px] md:justify-self-start lg:-ml-[64px] lg:max-w-[540px]">
            <div className="flex flex-col items-center gap-1">
              <div className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                Грузинский алфавит
              </div>
              <div className="landing-alphabet-hint self-center">
                <div>
                  Нажми на букву и послушай звук
                </div>
              </div>
              <div className="landing-alpha-card min-w-0 self-center">
                <LandingAlphabet />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-showcase-section mx-auto mt-12 w-full max-w-[1240px] px-4 pb-12 pt-0 sm:mt-4 sm:px-6 sm:pb-16 sm:pt-0 lg:mt-6 lg:px-8 lg:pb-20 lg:pt-1">
        <div className="max-w-[760px]">
          <div className="landing-showcase-title text-[20px] font-bold tracking-[-0.015em] text-[var(--text-primary)]">
            Что внутри Deda
          </div>
        </div>

        <div className="landing-screens-grid landing-screens-grid--light mt-10 sm:mt-6">
          {lightInterfaceSlots.map(slot => (
            <div
              key={slot.src}
              className={`landing-screen-item${slot.cropFrame ? ' landing-screen-item--crop-frame' : ''}`}
            >
              <Image
                src={slot.src}
                alt={slot.title}
                width={800}
                height={1600}
                className={`landing-screen-media${slot.mobileContain ? ' landing-screen-media--contain-mobile' : ''}`}
              />
            </div>
          ))}
        </div>

        <div className="landing-screens-grid landing-screens-grid--dark mt-10 sm:mt-6">
          {darkInterfaceSlots.map(slot => (
            <div
              key={slot.src}
              className={`landing-screen-item${slot.cropFrame ? ' landing-screen-item--crop-frame' : ''}`}
            >
              <Image
                src={slot.src}
                alt={slot.title}
                width={800}
                height={1600}
                className={`landing-screen-media${slot.mobileContain ? ' landing-screen-media--contain-mobile' : ''}`}
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
