import Image from 'next/image';
import LandingAlphabet from '@/components/LandingAlphabet';

const interfaceSlots = [
  {
    title: 'Скрин 7',
    description: 'Новый экран',
    src: '/landing/deda-new-screen-7.png',
  },
  {
    title: 'Скрин 3',
    description: 'Новый экран',
    src: '/landing/deda-new-screen-3.png',
  },
  {
    title: 'Скрин 5',
    description: 'Новый экран',
    src: '/landing/deda-new-screen-5.png',
  },
];

export const metadata = {
  title: 'Deda — учимся читать по-грузински через игру',
  description: 'Короткий лендинг Deda без прокрутки.',
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
      justify-content: space-between;
      gap: 14px;
      padding-left: 18px;
      max-width: 680px;
      font-size: 16px;
      line-height: 1.34;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .landing-alphabet-hint::before {
      content: '';
      position: absolute;
      left: 0;
      top: 4px;
      bottom: 4px;
      width: 4px;
      border-radius: 999px;
      background: linear-gradient(180deg, var(--accent) 0%, #facc15 100%);
      box-shadow: 0 0 18px rgba(249, 115, 22, 0.18);
    }

    .landing-alphabet-hint strong {
      color: var(--accent);
      font-weight: 700;
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
      max-height: min(36vh, 296px);
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
      min-width: 222px;
    }

    .landing-cta-row {
      display: inline-flex;
      align-items: flex-end;
      flex-wrap: nowrap;
      gap: 10px;
    }

    .landing-cta-cat {
      flex: 0 0 auto;
      transform: translateY(22px);
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
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
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
        gap: 8px;
      }

      .landing-cta-cat {
        margin-right: -2px;
        transform: translateY(22px);
      }

      .landing-screens-grid {
        grid-auto-columns: max-content;
        gap: 8px;
        padding-bottom: 4px;
      }

      .landing-screen-media {
        width: min(78vw, 296px);
        max-width: min(78vw, 296px);
        height: auto;
        max-height: min(29vh, 214px);
      }

      .landing-screen-item--crop-frame {
        width: min(78vw, 286px);
        max-height: min(42vh, 360px);
      }

      .landing-screen-item--crop-frame .landing-screen-media {
        width: 100%;
        height: min(42vh, 360px);
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
  `;

  return (
    <main className="landing-shell min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <style dangerouslySetInnerHTML={{ __html: landingStyles }} />
      <section className="mx-auto flex w-full max-w-[1240px] flex-col justify-center px-4 pt-12 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="landing-hero-grid grid grid-cols-1 md:grid-cols-[minmax(0,1.08fr)_minmax(250px,0.92fr)]">
          <div className="landing-copy max-w-none md:col-start-1 md:row-start-1">
            <h1 className="landing-title max-w-[620px] text-[clamp(24px,4vw,50px)] font-semibold leading-[1.06] tracking-[-0.02em]">
              Учимся читать
              <br />
              по-грузински, играя
            </h1>
            <p className="landing-subtitle mt-6 text-[clamp(15px,2vw,20px)] leading-[1.4] text-[var(--text-secondary)]">
              Слушай буквы, читай карточки
              <br />
              и закрепляй чтение в игре.
            </p>
            <div className="landing-cta-row mt-6">
              <Image
                src="/images/deda-cat.png"
                alt="Deda cat"
                width={136}
                height={136}
                priority
                className="landing-cta-cat h-auto w-[126px] shrink-0 object-contain drop-shadow-[0_8px_18px_rgba(15,23,42,0.08)] sm:w-[144px] lg:w-[170px]"
              />
              <a
                href="/lessons"
                className="landing-cta-btn inline-flex h-[58px] items-center justify-center rounded-2xl border border-[var(--accent)] bg-[var(--accent)] px-9 text-[18px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Начать читать
              </a>
            </div>
          </div>

          <div className="relative mt-14 w-full max-w-[420px] md:col-start-2 md:row-span-2 md:row-start-1 md:mt-10 md:justify-self-center lg:max-w-[490px]">
            <div className="flex flex-col items-center gap-3">
              <div className="landing-alphabet-hint self-center">
                <div>
                  <strong>Нажми на букву</strong> и послушай, как она звучит
                </div>
              </div>
              <div className="landing-alpha-card min-w-0 self-center">
                <LandingAlphabet />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-4 w-full max-w-[1240px] px-4 pb-12 pt-3 sm:mt-6 sm:px-6 sm:pb-16 sm:pt-5 lg:mt-8 lg:px-8 lg:pb-20 lg:pt-6">
        <div className="max-w-[760px]">
          <div className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            Что внутри Deda
          </div>
          <div className="landing-swipe-hint">Листай влево, чтобы посмотреть экраны</div>
        </div>

        <div className="landing-screens-grid mt-4 sm:mt-5">
          {interfaceSlots.map((slot, index) => (
            <div
              key={slot.src}
              id={index === 0 ? 'screens-lessons' : index === 2 ? 'screens-game' : undefined}
              className={`landing-screen-item${slot.cropFrame ? ' landing-screen-item--crop-frame' : ''}`}
            >
              <Image
                src={slot.src}
                alt={slot.title}
                width={800}
                height={1600}
                className="landing-screen-media"
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
