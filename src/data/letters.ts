export interface LetterData {
  char: string;
  latin: string;
  audioKey: string;
  tier: 1 | 2 | 3;
}

export const LETTERS: LetterData[] = [
  { char: 'ა', latin: 'a',    audioKey: 'letter-a',   tier: 1 },
  { char: 'ბ', latin: 'b',    audioKey: 'letter-b',   tier: 1 },
  { char: 'გ', latin: 'g',    audioKey: 'letter-g',   tier: 1 },
  { char: 'დ', latin: 'd',    audioKey: 'letter-d',   tier: 1 },
  { char: 'ე', latin: 'e',    audioKey: 'letter-e',   tier: 1 },
  { char: 'ვ', latin: 'v',    audioKey: 'letter-v',   tier: 1 },
  { char: 'ზ', latin: 'z',    audioKey: 'letter-z',   tier: 1 },
  { char: 'თ', latin: 'th',   audioKey: 'letter-th',  tier: 2 },
  { char: 'ი', latin: 'i',    audioKey: 'letter-i',   tier: 1 },
  { char: 'კ', latin: "k'",   audioKey: 'letter-k',   tier: 1 },
  { char: 'ლ', latin: 'l',    audioKey: 'letter-l',   tier: 1 },
  { char: 'მ', latin: 'm',    audioKey: 'letter-m',   tier: 1 },
  { char: 'ნ', latin: 'n',    audioKey: 'letter-n',   tier: 1 },
  { char: 'ო', latin: 'o',    audioKey: 'letter-o',   tier: 1 },
  { char: 'პ', latin: "p'",   audioKey: 'letter-p',   tier: 1 },
  { char: 'ჟ', latin: 'zh',   audioKey: 'letter-zh',  tier: 3 },
  { char: 'რ', latin: 'r',    audioKey: 'letter-r',   tier: 1 },
  { char: 'ს', latin: 's',    audioKey: 'letter-s',   tier: 1 },
  { char: 'ტ', latin: "t'",   audioKey: 'letter-t',   tier: 2 },
  { char: 'უ', latin: 'u',    audioKey: 'letter-u',   tier: 1 },
  { char: 'ფ', latin: 'p',    audioKey: 'letter-ph',  tier: 2 },
  { char: 'ქ', latin: 'k',    audioKey: 'letter-q',   tier: 2 },
  { char: 'ღ', latin: 'gh',   audioKey: 'letter-gh',  tier: 3 },
  { char: 'ყ', latin: "q'",   audioKey: 'letter-qh',  tier: 3 },
  { char: 'შ', latin: 'sh',   audioKey: 'letter-sh',  tier: 2 },
  { char: 'ჩ', latin: 'ch',   audioKey: 'letter-ch',  tier: 2 },
  { char: 'ც', latin: 'ts',   audioKey: 'letter-ts',  tier: 2 },
  { char: 'ძ', latin: 'dz',   audioKey: 'letter-dz',  tier: 3 },
  { char: 'წ', latin: "ts'",  audioKey: 'letter-tw',  tier: 3 },
  { char: 'ჭ', latin: "ch'",  audioKey: 'letter-chw', tier: 3 },
  { char: 'ხ', latin: 'kh',   audioKey: 'letter-kh',  tier: 2 },
  { char: 'ჯ', latin: 'j',    audioKey: 'letter-j',   tier: 2 },
  { char: 'ჰ', latin: 'h',    audioKey: 'letter-h',   tier: 2 },
];
