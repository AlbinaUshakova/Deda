export type TransliterationMode = 'ru' | 'latin';

const GEORGIAN_TO_LATIN: Record<string, string> = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z', 'თ': 't',
  'ი': 'i', 'კ': "k'", 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': "p'", 'ჟ': 'zh',
  'რ': 'r', 'ს': 's', 'ტ': "t'", 'უ': 'u', 'ფ': 'p', 'ქ': 'k', 'ღ': 'gh', 'ყ': "q'",
  'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': "ts'", 'ჭ': "ch'", 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h',
};

const GEORGIAN_TO_RU: Record<string, string> = {
  'ა': 'а', 'ბ': 'б', 'გ': 'г', 'დ': 'д', 'ე': 'э', 'ვ': 'в', 'ზ': 'з', 'თ': 'т',
  'ი': 'и', 'კ': 'к', 'ლ': 'л', 'მ': 'м', 'ნ': 'н', 'ო': 'о', 'პ': 'п', 'ჟ': 'ж',
  'რ': 'р', 'ს': 'с', 'ტ': 'т', 'უ': 'у', 'ფ': 'ф', 'ქ': 'к', 'ღ': 'гх', 'ყ': 'к',
  'შ': 'ш', 'ჩ': 'ч', 'ც': 'ц', 'ძ': 'дз', 'წ': 'ц', 'ჭ': 'ч', 'ხ': 'х', 'ჯ': 'дж', 'ჰ': 'х',
};

export function geLetterToHint(ch: string, mode: TransliterationMode): string {
  return (mode === 'latin' ? GEORGIAN_TO_LATIN : GEORGIAN_TO_RU)[ch] ?? '';
}

export function geTextToHint(text: string, mode: TransliterationMode): string {
  const map = mode === 'latin' ? GEORGIAN_TO_LATIN : GEORGIAN_TO_RU;
  return Array.from(text).map(ch => map[ch] ?? ch).join('');
}
