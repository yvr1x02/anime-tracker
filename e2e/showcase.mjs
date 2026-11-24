// The fake AniList's showcase data, for the README's screenshots (npm run screenshots): FAKE_SHOWCASE=1 swaps it in
// for the tests' data. Everything is invented, titles, plots and studios included, and the covers are abstract SVGs
// drawn here from each anime's colour: no real cover ever enters the repository (CLAUDE.md).

const HOUR = 3600;
const DAY = 24 * HOUR;

// [id, romaji, English, native, colour, format, episodes, minutes, genres, studio, plot]
const titles = [
  [21, "Tsuki no Ura no Yuubinkyoku", "The Post Office on the Far Side of the Moon", "月の裏の郵便局", "#5b7cfa", "TV", 12, 24, ["Fantasy", "Slice of Life"], "Studio Lanterna", "Letters lost on Earth end up on the Moon, where a young postmaster tries to deliver every one of them."],
  [22, "Koori no Gakudan", "The Ice Orchestra", "氷の楽団", "#4fc3d9", "TV", 24, 24, ["Drama", "Music"], "Studio Brezza", "In a town that never thaws, a band plays instruments carved from ice before the spring that never comes."],
  [23, "Hagane no Houkiboshi", "Comet of Steel", "鋼の箒星", "#e0574f", "TV", 13, 24, ["Action", "Sci-Fi"], "Officina Notte", "A retired mecha pilot rides a comet back to the colony she once swore to protect."],
  [24, "Ameiro Bakery", "Rain-Coloured Bakery", "雨色ベーカリー", "#f2a65a", "TV", 12, 24, ["Slice of Life", "Comedy"], "Studio Lanterna", "A bakery that opens only on rainy days, and the regulars who wait for the forecast."],
  [25, "Ryuusei Tantei Club", "Shooting Star Detective Club", "流星探偵クラブ", "#9b6cf2", "TV", 12, 24, ["Mystery", "Comedy"], "Studio Brezza", "Three students solve the mysteries their school would rather forget, one meteor shower at a time."],
  [26, "Kagerou Densha", "Heat-Haze Train", "陽炎電車", "#f06292", "TV", 11, 24, ["Supernatural", "Drama"], "Officina Notte", "A train that only runs on the hottest day of summer takes its passengers to the day they regret most."],
  [27, "Shiro Kujira no Mori", "Forest of the White Whale", "白鯨の森", "#3fb68b", "MOVIE", 1, 110, ["Adventure", "Fantasy"], "Studio Lanterna", "A whale swims through a forest at night, and a girl follows it to the edge of the map."],
  [28, "Hoshikuzu Kissaten", "Stardust Café", "星屑喫茶店", "#c9a227", "TV", 12, 24, ["Romance", "Slice of Life"], "Studio Brezza", "A café that serves one constellation a day, and the astronomer who keeps ordering the same one."],
  [29, "Yoake no Kenshi", "Swordsman of the Dawn", "夜明けの剣士", "#d65c3a", "TV", 24, 24, ["Action", "Adventure"], "Officina Notte", "A swordsman who can only fight between night and morning walks across a kingdom without sunrises."],
  [30, "Mizutama Planet", "Polka-Dot Planet", "水玉プラネット", "#47a8e5", "ONA", 10, 12, ["Comedy", "Sci-Fi"], "Studio Lanterna", "Two aliens open a laundry on a planet where it rains soap bubbles."],
  [31, "Kuroneko Koukyoukyoku", "Black Cat Symphony", "黒猫交響曲", "#7a6ff0", "TV", 12, 24, ["Music", "Mystery"], "Studio Brezza", "A conductor's cat knows the ending of every symphony, and of every crime in the concert hall."],
  [32, "Natsumatsuri Boueitai", "Summer Festival Defence Force", "夏祭り防衛隊", "#f5b941", "TV", 12, 24, ["Action", "Comedy"], "Officina Notte", "A neighbourhood festival committee defends the fireworks from a very polite alien invasion."],
];

/** An abstract cover: a gradient of the anime's colour, a large disc and three bands, different for each id. */
export function coverSvg(id) {
  const entry = titles.find(([key]) => key === id);
  if (!entry) return null;
  const color = entry[4];
  const turn = (id * 47) % 360;
  const x = 120 + ((id * 53) % 220);
  const y = 160 + ((id * 71) % 300);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 690" width="460" height="690">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="#140f2a"/>
    </linearGradient>
  </defs>
  <rect width="460" height="690" fill="url(#g)"/>
  <circle cx="${x}" cy="${y}" r="150" fill="#fff" opacity="0.16"/>
  <circle cx="${x}" cy="${y}" r="70" fill="#fff" opacity="0.22"/>
  <g transform="rotate(${turn} 230 345)" opacity="0.18" fill="#fff">
    <rect x="-200" y="430" width="900" height="18"/>
    <rect x="-200" y="480" width="900" height="8"/>
    <rect x="-200" y="520" width="900" height="30"/>
  </g>
</svg>`;
}

/**
 * The showcase's anime, season and calendar; `lists` builds a list with the fake's own `listEntry`, once these
 * anime are in its table. `base` is the fake's address (for the covers), `noon` the fake's noon in Rome.
 */
export function showcase({ base, noon, startedAt }) {
  // When each airing anime airs, weekly: days from today and the time in Rome. Today is busy on purpose.
  const slots = { 21: [0, "18:30"], 22: [2, "23:00"], 23: [3, "15:00"], 24: [0, "11:00"], 25: [1, "14:00"], 26: [-1, "13:00"], 28: [4, "21:30"], 29: [0, "23:00"], 30: [5, "10:00"], 31: [4, "13:00"], 32: [0, "15:00"] };
  // The screenshots are taken at 14:00 in Rome (scripts/screenshots.spec.ts): "next" is after that.
  const now = noon + 2 * HOUR;
  const airingAt = (id, week) => {
    const [day, time] = slots[id];
    const [hours, minutes] = time.split(":").map(Number);
    return noon + (day + 7 * week) * DAY + (hours - 12) * HOUR + minutes * 60;
  };
  const episodeOn = (id, week) => 8 + (id % 4) + week;

  const anime = {};
  for (const [id, romaji, english, native, color, format, episodes, duration, genres, studio, description] of titles) {
    const url = `${base}/covers/${id}.svg`;
    const airing = id in slots;
    const nextWeek = airing && airingAt(id, 0) <= now ? 1 : 0;
    anime[id] = {
      id,
      title: { romaji, english, native },
      coverImage: { medium: url, large: url, extraLarge: url, color },
      description,
      genres,
      studios: { nodes: [{ id: 100 + (id % 3), name: studio, isAnimationStudio: true }] },
      format,
      status: airing ? "RELEASING" : "FINISHED",
      episodes,
      duration,
      season: format === "MOVIE" ? null : "FALL",
      seasonYear: 2026,
      nextAiringEpisode: airing ? { episode: episodeOn(id, nextWeek), airingAt: airingAt(id, nextWeek) } : null,
      airingSchedule: {
        nodes: airing ? [0, 1, 2, 3].map((week) => ({ episode: episodeOn(id, nextWeek + week), airingAt: airingAt(id, nextWeek + week) })) : [],
      },
    };
  }
  const scheduleMedia = (id) => ({ id, isAdult: false, title: anime[id].title, coverImage: anime[id].coverImage, format: anime[id].format });
  const calendar = Object.keys(slots).flatMap((key) =>
    [-1, 0, 1].map((week) => {
      const id = Number(key);
      return { id: 5000 + id * 10 + week + 1, episode: episodeOn(id, week), airingAt: airingAt(id, week), media: scheduleMedia(id) };
    }),
  );
  const lists = (listEntry) => {
    const entry = (entryId, mediaId, status, progress, score, daysAgo) =>
      listEntry(entryId, mediaId, status, progress, score, startedAt - daysAgo * DAY, startedAt - (daysAgo + 30) * DAY);
    return [
      { entries: [entry(601, 21, "CURRENT", 5, 9, 1), entry(602, 23, "CURRENT", 9, 8.5, 2), entry(603, 26, "CURRENT", 3, 0, 4), entry(604, 31, "REPEATING", 6, 9.5, 6)] },
      { entries: [entry(605, 22, "COMPLETED", 24, 8, 20), entry(606, 27, "COMPLETED", 1, 9, 40), entry(607, 24, "COMPLETED", 12, 7.5, 60), entry(608, 30, "COMPLETED", 10, 7, 90)] },
      { entries: [entry(609, 25, "PLANNING", 0, 0, 10), entry(610, 28, "PLANNING", 0, 0, 120)] },
      { entries: [entry(611, 29, "PAUSED", 7, 6.5, 30)] },
    ];
  };
  return { anime, season: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32], calendar, lists };
}
