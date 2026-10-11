/** 초성 of a Hangul syllable; any other character is returned as is. Shared by the game and the admin preview. */
export const initial = (c: string) => {
  const n = c.charCodeAt(0) - 0xac00;
  return n >= 0 && n <= 11171
    ? "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"[Math.floor(n / 588)]
    : c;
};
