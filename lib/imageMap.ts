/**
 * Keyword → image resolver.
 * Put your PNG/SVGs in /public/images/icons/<category>/<name>.png
 * We match by Russian meaning first, then by Georgian word.
 */

export type CardLite = {
  ge_text?: string;
  ru_meaning?: string;
  image_url?: string;
};

type Entry = { test: RegExp; path: string };

// Common categories; extend freely
const ENTRIES: Entry[] = [
  // Nature
  { test: /(солнц|солнец|солныш)/i, path: '/images/icons/nature/sun.png' },
  { test: /(луна|месяц)/i, path: '/images/icons/nature/moon.png' },
  { test: /(вода|воду|воды|река|море|океан)/i, path: '/images/icons/nature/water.png' },
  { test: /(огон|плам)/i, path: '/images/icons/nature/fire.png' },
  { test: /(земл|почв|грунт)/i, path: '/images/icons/nature/earth.png' },
  { test: /(ветер|воздух)/i, path: '/images/icons/nature/wind.png' },
  { test: /(дерев|лес|дерево)/i, path: '/images/icons/nature/tree.png' },
  { test: /(цветок|цветы)/i, path: '/images/icons/nature/flower.png' },
  { test: /(гора|горы)/i, path: '/images/icons/nature/mountain.png' },
  { test: /(река|ручей)/i, path: '/images/icons/nature/river.png' },

  // Animals
  { test: /(собак|пс)/i, path: '/images/icons/animals/dog.png' },
  { test: /(кошк|кот)/i, path: '/images/icons/animals/cat.png' },
  { test: /(птиц|птич)/i, path: '/images/icons/animals/bird.png' },
  { test: /(рыб|рыба)/i, path: '/images/icons/animals/fish.png' },
  { test: /(лошад)/i, path: '/images/icons/animals/horse.png' },
  { test: /(коров|бык)/i, path: '/images/icons/animals/cow.png' },

  // Food
  { test: /(яблок|фрукт)/i, path: '/images/icons/food/apple.png' },
  { test: /(хлеб|булк)/i, path: '/images/icons/food/bread.png' },
  { test: /(сыр)/i, path: '/images/icons/food/cheese.png' },
  { test: /(молок)/i, path: '/images/icons/food/milk.png' },
  { test: /(чай)/i, path: '/images/icons/food/tea.png' },
  { test: /(кофе)/i, path: '/images/icons/food/coffee.png' },

  // People / Family
  { test: /(мама|мать)/i, path: '/images/icons/people/mother.png' },
  { test: /(папа|отец)/i, path: '/images/icons/people/father.png' },
  { test: /(сын)/i, path: '/images/icons/people/son.png' },
  { test: /(дочь)/i, path: '/images/icons/people/daughter.png' },
  { test: /(мужчина|человек|парень)/i, path: '/images/icons/people/man.png' },
  { test: /(женщина|девушка)/i, path: '/images/icons/people/woman.png' },

  // Home / Objects
  { test: /(дом|квартира|жилье)/i, path: '/images/icons/home/house.png' },
  { test: /(книга|книг)/i, path: '/images/icons/objects/book.png' },
  { test: /(ручк|карандаш|пис)/i, path: '/images/icons/objects/pen.png' },
  { test: /(стол)/i, path: '/images/icons/objects/table.png' },
  { test: /(стул)/i, path: '/images/icons/objects/chair.png' },

  // Colors
  { test: /(красн)/i, path: '/images/icons/colors/red.png' },
  { test: /(син|голуб)/i, path: '/images/icons/colors/blue.png' },
  { test: /(зел)/i, path: '/images/icons/colors/green.png' },
  { test: /(желт)/i, path: '/images/icons/colors/yellow.png' },
  { test: /(черн)/i, path: '/images/icons/colors/black.png' },
  { test: /(бел)/i, path: '/images/icons/colors/white.png' },

  // Transport
  { test: /(машин|авто|тачк)/i, path: '/images/icons/transport/car.png' },
  { test: /(автобус)/i, path: '/images/icons/transport/bus.png' },
  { test: /(поезд)/i, path: '/images/icons/transport/train.png' },
  { test: /(самолет|самолёт|аэроплан)/i, path: '/images/icons/transport/plane.png' },
];

// Georgian word direct map (quick wins)
const GE_FAST_MAP: Record<string, string> = {
  "მზე": "/images/icons/nature/sun.png",
  " მთვარე": "/images/icons/nature/moon.png",
  "წყალი": "/images/icons/nature/water.png",
  "ცეცხლი": "/images/icons/nature/fire.png",
  "земля": "/images/icons/nature/earth.png",
  "ძაღლი": "/images/icons/animals/dog.png",
  "კატა": "/images/icons/animals/cat.png",
  "თევზი": "/images/icons/animals/fish.png",
  "სახლი": "/images/icons/home/house.png",
  "წიგნი": "/images/icons/objects/book.png",
};

export function pickImageForCard(card: CardLite): string | null {
  // 1) explicit image_url wins
  if (card.image_url) return card.image_url;

  // 2) russian meaning regexes
  const ru = (card.ru_meaning || '').trim();
  if (ru) {
    for (const e of ENTRIES) if (e.test.test(ru)) return e.path;
  }

  // 3) direct georgian map
  const ge = (card.ge_text || '').trim();
  if (ge && GE_FAST_MAP[ge]) return GE_FAST_MAP[ge];

  return null;
}
