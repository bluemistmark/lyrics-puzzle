// 랭킹 닉네임 규칙. api/ranking.ts가 같은 규칙을 복사해 쓰고(로컬 import 금지),
// DB는 길이만 검사합니다. api/ranking.test.ts가 둘이 같은지 확인합니다.

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 12;

/** Trims and collapses inner whitespace. */
export const normalizeNickname = (name: string) =>
  name.trim().replace(/\s+/g, " ");

/** Korean error for an invalid (normalized) nickname, or null. */
export function nicknameError(name: string): string | null {
  if (!name) return "닉네임을 입력하세요.";
  if (name.length < NICKNAME_MIN || name.length > NICKNAME_MAX)
    return `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력하세요.`;
  if (!/^[가-힣A-Za-z0-9 _.-]+$/.test(name))
    return "한글, 영문, 숫자, 공백과 _ . - 만 쓸 수 있어요.";
  return null;
}
