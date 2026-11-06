import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { MARK_CHECK_PATH, MARK_RING_PATH, MARK_VIEWBOX } from "@/components/marketing/graphics/LoopMark";
import {
  LOGO_ASPECT,
  LOGO_VIEWBOX,
  LOGO_WORDMARK_OFFSET,
  WORDMARK_LOOP_PATH,
  WORDMARK_PROMISE_PATH,
} from "@/components/marketing/graphics/Logo";

// OG image (brief §4.7): paper background, H1 in Manrope 700 Greenback, mark at right, logo bottom-left.
export const alt = "PromiseLoop. Your unpaid jobs are a pipeline. We work it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#F6F4EE";
const BRAND = "#0B3D2E";
const MINT = "#1FAA70";

function svgUri(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const MARK_SVG = (ring: string, check: string) =>
  `<path d="${MARK_RING_PATH}" fill="none" stroke="${ring}" stroke-width="3.2" stroke-linecap="round"/>` +
  `<path d="${MARK_CHECK_PATH}" fill="none" stroke="${check}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;

const LOGO_SRC = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}">${MARK_SVG(MINT, BRAND)}` +
    `<g transform="translate(${LOGO_WORDMARK_OFFSET.x} ${LOGO_WORDMARK_OFFSET.y})">` +
    `<path fill="${BRAND}" d="${WORDMARK_PROMISE_PATH}"/><path fill="${MINT}" d="${WORDMARK_LOOP_PATH}"/></g></svg>`,
);
const MARK_SRC = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}">${MARK_SVG(MINT, BRAND)}</svg>`);

export default async function OpengraphImage() {
  const manrope = await readFile(join(process.cwd(), "app/fonts/Manrope-Bold.ttf"));
  const logoH = 56;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", position: "relative", background: PAPER, fontFamily: "Manrope" }}>
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 88,
            width: 780,
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            color: BRAND,
          }}
        >
          Your unpaid jobs are a pipeline. We work it.
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MARK_SRC}
          width={240}
          height={240}
          alt=""
          style={{ position: "absolute", right: 80, top: 210 }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_SRC}
          width={Math.round(logoH * LOGO_ASPECT)}
          height={logoH}
          alt=""
          style={{ position: "absolute", left: 72, bottom: 72 }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Manrope", data: manrope, style: "normal", weight: 700 }],
    },
  );
}
