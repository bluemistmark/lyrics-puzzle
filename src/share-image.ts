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
    bg: "#f2f3f0",
    card: "#ffffff",
    ink: "#111311",
    sub: "#5f6660",
    hit: "#a8dc1f",
    miss: "#e6e8e3",
  },
  dark: {
    bg: "#0f110f",
    card: "#1b1e1b",
    ink: "#f1f3ef",
    sub: "#a3aaa4",
    hit: "#c4f53a",
    miss: "#2a2e2a",
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

/** Canvas with the theme's background and card drawn, fonts loaded. */
async function startCard() {
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
  return { canvas, ctx, p };
}

const toPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(Error("이미지를 만들 수 없어요.")),
      "image/png",
    ),
  );

/** `lines` is the share text split into lines; the first is the heading. */
export async function drawShareCard(
  grid: ShareGrid | null,
  lines: string[],
): Promise<Blob> {
  const { canvas, ctx, p } = await startCard();

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

  return toPng(canvas);
}

export type RecordCard = {
  /** Big numbers across the top: [label, value]. */
  headline: [string, string][];
  /** Smaller figures beside the rings: [label, value]. */
  details: [string, string][];
  /** Rings like the 기록 dashboard's: [label, percent 0–100]. */
  rings: [string, number][];
  /** Line at the bottom, e.g. the date the card was made. */
  footer: string;
};

/** 기록 탭 share card: headline numbers, three rings (as on the dashboard) and a few details. */
export async function drawRecordCard(r: RecordCard): Promise<Blob> {
  const { canvas, ctx, p } = await startCard();
  ctx.fillStyle = p.ink;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText("네오 노래 퀴즈 · 나의 기록", 96, 128);

  // Headline: equal columns of label over a big number.
  const colW = (W - 192) / r.headline.length;
  r.headline.forEach(([label, value], i) => {
    const x = 96 + i * colW;
    ctx.fillStyle = p.sub;
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText(label, x, 196);
    ctx.fillStyle = p.ink;
    ctx.font = `800 58px ${FONT}`;
    ctx.fillText(value, x, 262);
  });

  // Rings: a track with the share done in the accent, the percent inside, a label below.
  const top = 320;
  const radius = 62;
  const spacing = 172;
  r.rings.forEach(([label, percent], i) => {
    const cx = 96 + radius + i * spacing;
    const cy = top + radius + 8;
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.strokeStyle = p.miss;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (percent > 0) {
      ctx.strokeStyle = p.hit;
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        radius,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2 * Math.min(percent, 100)) / 100,
      );
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = p.ink;
    ctx.font = `800 34px ${FONT}`;
    ctx.fillText(`${percent}%`, cx, cy + 12);
    ctx.fillStyle = p.sub;
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText(label, cx, cy + radius + 44);
    ctx.textAlign = "left";
  });

  // Details to the right of the rings.
  const dx = 96 + spacing * r.rings.length + 24;
  r.details.forEach(([label, value], i) => {
    const y = top + 22 + i * 56;
    ctx.fillStyle = p.sub;
    ctx.font = `500 24px ${FONT}`;
    ctx.fillText(label, dx, y);
    ctx.fillStyle = p.ink;
    ctx.font = `800 28px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(value, W - 96, y);
    ctx.textAlign = "left";
  });

  ctx.fillStyle = p.sub;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText(r.footer, 96, H - 72);
  return toPng(canvas);
}
