/** Ways to play the normal (non-daily) tab. Ids are persisted, so don't rename them. */
export type PlayMode = "classic" | "simple" | "easy";
export const PLAY_MODES: { id: PlayMode; name: string; description: string }[] =
  [
    {
      id: "classic",
      name: "클래식",
      description:
        "초성 가사를 풀면서 노래 제목을 맞혀요.\n기록·도감·업적이 쌓이는 모드예요.",
    },
    {
      id: "easy",
      name: "이지",
      description:
        "가수와 제목이 공개돼요.\n초성 가사를 끝까지 채우면 성공이에요.",
    },
    {
      id: "simple",
      name: "심플",
      description: "가사가 모두 공개돼요.\n가사를 읽고 노래 제목을 맞혀요.",
    },
  ];
export const playModeName = (mode: PlayMode) =>
  PLAY_MODES.find((m) => m.id === mode)!.name;
export const isPlayMode = (value: unknown): value is PlayMode =>
  PLAY_MODES.some((m) => m.id === value);
