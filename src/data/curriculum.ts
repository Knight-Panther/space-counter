// Wave → chars to formally introduce that wave.
// Lists ALL content in tier order — free/premium filtering happens in GameScene at runtime.
// Map<waveNumber, string[]> where string is the item's `char` field.

// Alphabet — 33 letters total
// Tier 1 (17): ა ბ გ დ ე ვ ზ ი კ ლ მ ნ ო პ რ ს უ  — waves 1–9
// Tier 2 (10): თ ტ ფ ქ შ ჩ ც ხ ჯ ჰ               — waves 10–15
// Tier 3  (6): ჟ ღ ყ ძ წ ჭ                         — waves 16–20
// Waves 21–30: reinforcement only (no new chars)
export const ALPHABET_CURRICULUM: Map<number, string[]> = new Map([
  [1,  ['ა', 'ბ']],
  [2,  ['გ', 'დ']],
  [3,  ['ე', 'ვ']],
  [4,  ['ზ', 'ი']],
  [5,  ['კ', 'ლ']],
  [6,  ['მ', 'ნ']],
  [7,  ['ო', 'პ']],
  [8,  ['რ', 'ს']],
  [9,  ['უ']],
  [10, ['თ', 'ტ']],
  [11, ['ფ', 'ქ']],
  [12, ['შ', 'ჩ']],
  [13, ['ც', 'ხ']],
  [14, ['ჯ']],
  [15, ['ჰ']],
  [16, ['ჟ', 'ღ']],
  [17, ['ყ']],
  [18, ['ძ']],
  [19, ['წ']],
  [20, ['ჭ']],
]);

// Numbers — 20 numbers total
// Tier 1 (10): 1–10  — waves 1–5  (free)
// Tier 2 (10): 11–20 — waves 6–10 (premium)
// Waves 11–30: reinforcement only
export const NUMBERS_CURRICULUM: Map<number, string[]> = new Map([
  [1,  ['ერთი',     'ორი']],
  [2,  ['სამი',     'ოთხი']],
  [3,  ['ხუთი',     'ექვსი']],
  [4,  ['შვიდი',    'რვა']],
  [5,  ['ცხრა',     'ათი']],
  [6,  ['თერთმეტი', 'თორმეტი']],
  [7,  ['ცამეტი',   'თოთხმეტი']],
  [8,  ['თხუთმეტი', 'თექვსმეტი']],
  [9,  ['ჩვიდმეტი', 'თვრამეტი']],
  [10, ['ცხრამეტი', 'ოცი']],
]);
