export type GameMode = 'alphabet' | 'numbers';

export interface ItemData {
  char: string;      // Georgian letter or number word — shown on answer buttons
  latin: string;     // Latin transliteration shown as hint under button
  audioKey: string;  // Phaser audio key for pronunciation clip
  display: string;   // Text shown ON the falling alien (= char for letters, Arabic numeral for numbers)
  tier: 1 | 2 | 3;  // Difficulty tier — unlocked progressively by wave
}
