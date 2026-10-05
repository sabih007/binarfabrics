/* ==========================================================================
   The BinAr Fabrics mark — the woven square from the logo.

   Traced from the supplied artwork (Logoweb.jpeg) rather than shipped as an
   image: the mark is twelve axis-aligned bars on a regular grid, so as SVG
   it stays crisp from a 16px favicon to a print sheet, carries no white box
   onto cream backgrounds, and costs a fraction of a JPEG.

   The grid is 11 x 11 units: bars are 1 unit thick and sit every 2 units,
   which is exactly the proportion measured off the original.
   ========================================================================== */

/** Brand colours, sampled from the artwork. */
export const BRAND = {
  green: "#099268",
  red: "#ba001b",
  amber: "#fbad0b",
  blue: "#0756e6",
} as const;

/** [x, y, width, height] per bar, grouped by the quadrant each belongs to. */
const BARS: [keyof typeof BRAND, number, number, number, number][] = [
  // Top-left: verticals, stepping up to the centre.
  ["green", 0, 4, 1, 1],
  ["green", 2, 2, 1, 3],
  ["green", 4, 0, 1, 5],
  // Top-right: horizontals, stepping out from the centre.
  ["red", 6, 0, 1, 1],
  ["red", 6, 2, 3, 1],
  ["red", 6, 4, 5, 1],
  // Bottom-left: horizontals, mirroring the red.
  ["amber", 0, 6, 5, 1],
  ["amber", 2, 8, 3, 1],
  ["amber", 4, 10, 1, 1],
  // Bottom-right: verticals, mirroring the green.
  ["blue", 6, 6, 1, 5],
  ["blue", 8, 6, 1, 3],
  ["blue", 10, 6, 1, 1],
];

export interface BrandMarkProps {
  /** Rendered width and height in pixels. */
  size?: number;
  /**
   * "ink" paints every bar in `currentColor` — for the thermal receipt and
   * anywhere else that has one colour to spend.
   */
  tone?: "colour" | "ink";
  className?: string;
  /** Omit on decorative uses that sit beside the wordmark. */
  title?: string;
}

export default function BrandMark({ size = 28, tone = "colour", className, title }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 11 11"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {BARS.map(([colour, x, y, w, h]) => (
        <rect
          key={`${colour}${x}${y}`}
          x={x}
          y={y}
          width={w}
          height={h}
          rx={0.1}
          fill={tone === "ink" ? "currentColor" : BRAND[colour]}
        />
      ))}
    </svg>
  );
}
