// Draws the spoiler-free result card (see share.ts) as a PNG, in the current theme's colors.
import type { ShareGrid } from "./share.ts";

type Palette = {
  bg: string;
  card: string;
  ink: string;
  sub: string;
  hit: string;
  miss: string;
};

const PALETTES: Record<string, Palette> = {
  light: {
    bg: "#f7f8f4",
    card: "#ffffff",
    ink: "#183d2d",
    sub: "#648157",
    hit: "#83bd39",
    miss: "#e3ead9",
  },
  dark: {
    bg: "#111712",
    card: "#1c251d",
    ink: "#e3f0da",
    sub: "#9fbf86",
    hit: "#bce583",
    miss: "#2a3529",
  },
  excel: {
    bg: "#ffffff",
    card: "#ffffff",
    ink: "#202b25",
    sub: "#5f6f66",
    hit: "#217346",
    miss: "#e8ede9",
  },
  notebook: {
    bg: "#fff8f2",
    card: "#fffdfb",
    ink: "#6f3d58",
    sub: "#967787",
    hit: "#e89bb9",
    miss: "#f6e3ea",
  },
  console: {
    bg: "#17132b",
    card: "#24203e",
    ink: "#e9e5ff",
    sub: "#b8abd8",
    hit: "#7cf5d8",
    miss: "#302a50",
  },
  space: {
    bg: "#070a1c",
    card: "#121a3f",
    ink: "#eef1ff",
    sub: "#9fb0e8",
    hit: "#8ecbff",
    miss: "#1f2750",
  },
  exam: {
    bg: "#fbfbf8",
    card: "#ffffff",
    ink: "#111111",
    sub: "#666666",
    hit: "#111111",
    miss: "#e2e2e2",
  },
};

const W = 1200;
const H = 675;
const FONT = '"Pretendard Variable", Pretendard, sans-serif';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** `lines` is the share text split into lines; the first is the heading. */
export async function drawShareCard(
  grid: ShareGrid | null,
  lines: string[],
): Promise<Blob> {
  const theme = document.documentElement.dataset.theme ?? "light";
  const p = PALETTES[theme] ?? PALETTES.light;
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = p.card;
  roundRect(ctx, 40, 40, W - 80, H - 80, 36);

  const [heading, outcome, stats] = lines;
  ctx.fillStyle = p.ink;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText(heading ?? "", 96, 128);
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(outcome ?? "", 96, 184);
  ctx.fillStyle = p.sub;
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText(stats ?? "", 96, 230);

  // Grid: one square per revealable letter, words separated by a wider gap.
  if (grid?.length) {
    const top = 280;
    const areaW = W - 192;
    const areaH = H - top - 110;
    const wordGap = 0.8;
    const units = Math.max(
      ...grid.map(
        (line) =>
          line.reduce((n, word) => n + word.length, 0) +
          Math.max(0, line.length - 1) * wordGap,
      ),
      1,
    );
    const step = Math.min(areaW / units, areaH / grid.length, 56);
    const size = step * 0.82;
    grid.forEach((line, l) => {
      let x = 96;
      const y = top + l * step;
      for (const word of line) {
        for (const cell of word) {
          ctx.fillStyle = cell === "hit" ? p.hit : p.miss;
          roundRect(ctx, x, y, size, size, size * 0.22);
          x += step;
        }
        x += step * wordGap;
      }
    });
  }

  ctx.fillStyle = p.sub;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText(lines[3] ?? "", 96, H - 88);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(Error("이미지를 만들 수 없어요.")),
      "image/png",
    ),
  );
}
