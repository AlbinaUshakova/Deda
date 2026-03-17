'use client';

const GEORGIAN_ALPHABET = [
  'ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'თ', 'ი', 'კ', 'ლ',
  'მ', 'ნ', 'ო', 'პ', 'ჟ', 'რ', 'ს', 'ტ', 'უ', 'ფ', 'ქ',
  'ღ', 'ყ', 'შ', 'ჩ', 'ც', 'ძ', 'წ', 'ჭ', 'ხ', 'ჯ', 'ჰ',
];

const letterTranslit: Record<string, string> = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z', 'თ': 't',
  'ი': 'i', 'კ': "k'", 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': "p'", 'ჟ': 'zh',
  'რ': 'r', 'ს': 's', 'ტ': "t'", 'უ': 'u', 'ფ': 'p', 'ქ': 'k', 'ღ': 'gh', 'ყ': "q'",
  'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': "ts'", 'ჭ': "ch'", 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h',
};

const geLetterAudioMap: Record<string, string> = {
  'ა': '/audio/letters/01-ani.mp3',
  'ბ': '/audio/letters/02-bani.mp3',
  'გ': '/audio/letters/03-gani.mp3',
  'დ': '/audio/letters/04-doni.mp3',
  'ე': '/audio/letters/05-eni.mp3',
  'ვ': '/audio/letters/06-vini.mp3',
  'ზ': '/audio/letters/07-zeni.mp3',
  'თ': '/audio/letters/08-tani.mp3',
  'ი': '/audio/letters/09-ini.mp3',
  'კ': '/audio/letters/10-kani.mp3',
  'ლ': '/audio/letters/11-lasi.mp3',
  'მ': '/audio/letters/12-mani.mp3',
  'ნ': '/audio/letters/13-nari.mp3',
  'ო': '/audio/letters/14-oni.mp3',
  'პ': '/audio/letters/15-pari.mp3',
  'ჟ': '/audio/letters/16-jhani.mp3',
  'რ': '/audio/letters/17-rae.mp3',
  'ს': '/audio/letters/18-sani.mp3',
  'ტ': '/audio/letters/19-tari.mp3',
  'უ': '/audio/letters/20-uni.mp3',
  'ფ': '/audio/letters/21-phari.mp3',
  'ქ': '/audio/letters/22-khani-q.mp3',
  'ღ': '/audio/letters/23-ghani.mp3',
  'ყ': '/audio/letters/24-qari.mp3',
  'შ': '/audio/letters/25-shini.mp3',
  'ჩ': '/audio/letters/26-chini.mp3',
  'ც': '/audio/letters/27-tsani.mp3',
  'ძ': '/audio/letters/28-dzili.mp3',
  'წ': '/audio/letters/29-tsili.mp3',
  'ჭ': '/audio/letters/30-chari.mp3',
  'ხ': '/audio/letters/31-khani-x.mp3',
  'ჯ': '/audio/letters/32-jani.mp3',
  'ჰ': '/audio/letters/33-hae.mp3',
};

export default function LandingAlphabet() {
  const speakLetter = (letter: string) => {
    const localAudioSrc = geLetterAudioMap[letter];
    if (localAudioSrc) {
      const audio = new Audio(localAudioSrc);
      audio.volume = 1;
      audio.play().catch(() => {});
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(letter);
    const voices = synth.getVoices();
    const geVoice = voices.find(v => v.lang?.toLowerCase().startsWith('ka'));
    if (geVoice) {
      utterance.voice = geVoice;
      utterance.lang = geVoice.lang;
    } else {
      utterance.lang = 'ka-GE';
    }
    utterance.rate = 0.9;
    synth.speak(utterance);
  };

  return (
    <div className="home-alphabet-panel rounded-[clamp(13px,1.8vw,20px)] border border-slate-200/75 bg-gradient-to-b from-[#f6f8fe]/88 via-[#f1f4fc]/86 to-[#edf1f9]/84 p-[clamp(4px,0.65vw,8px)] shadow-[0_6px_14px_rgba(15,23,42,0.1)]">
      <div className="grid grid-cols-4 gap-x-[clamp(2px,0.45vw,6px)] gap-y-[clamp(3px,0.65vw,8px)] sm:grid-cols-5 md:grid-cols-6">
        {GEORGIAN_ALPHABET.map(ch => (
          <button
            key={ch}
            type="button"
            onClick={() => speakLetter(ch)}
            className="home-alphabet-key rounded-[9px] border border-slate-200/75 bg-white/90 px-[clamp(2px,0.28vw,4px)] py-[clamp(3px,0.56vw,6px)] text-center shadow-sm transition-all hover:bg-slate-50"
            title={`Озвучить букву ${ch}`}
            aria-label={`Озвучить букву ${ch}`}
          >
            <div className="home-alphabet-letter text-[clamp(14px,1.9vw,22px)] leading-none text-black">{ch}</div>
            <div className="home-alphabet-translit mt-[2px] text-[clamp(8px,0.95vw,12px)] leading-none text-slate-500">{letterTranslit[ch]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
