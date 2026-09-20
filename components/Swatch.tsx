import type { CSSProperties } from "react";
import type { Pattern } from "@/lib/products";

interface SwatchProps {
  pattern: Pattern;
  colors: string[];
  label?: string;
  image?: string;
  alt?: string;
  className?: string;
}

/**
 * Product artwork. Renders a real photo when `image` is set, otherwise a
 * generated fabric-print swatch driven by `pattern` + `colors`.
 */
export default function Swatch({ pattern, colors, label, image, alt, className = "" }: SwatchProps) {
  if (image) {
    return (
      <div className={`swatch swatch--photo ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={alt ?? ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        {label && <span className="swatch__label">{label}</span>}
      </div>
    );
  }
  const [c1, c2, c3] = colors;
  const style = { "--c1": c1 ?? "#d9cfc0", "--c2": c2 ?? "#fff", "--c3": c3 ?? c2 ?? "#fff" } as CSSProperties;
  return (
    <div className={`swatch swatch--${pattern} ${className}`} style={style}>
      <span className="swatch__weave" />
      {label && <span className="swatch__label">{label}</span>}
    </div>
  );
}
