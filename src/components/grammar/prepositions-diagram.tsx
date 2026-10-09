/** Las nueve preposiciones de lugar con una caja y una pelota (doble codificación: imagen + palabra). */

type Panel = { prep: string; es: string; draw: React.ReactNode };

const box = (x = 30, y = 38, key = "b") => (
  <g key={key}>
    <rect
      x={x}
      y={y}
      width="40"
      height="30"
      rx="3"
      fill="var(--surface-2)"
      stroke="var(--ink-2)"
      strokeWidth="1.5"
    />
    <path d={`M${x} ${y} l8 -8 h40 l-8 8 Z`} fill="var(--surface)" stroke="var(--ink-2)" strokeWidth="1.5" />
    <path
      d={`M${x + 40} ${y} l8 -8 v30 l-8 8 Z`}
      fill="var(--line)"
      stroke="var(--ink-2)"
      strokeWidth="1.5"
    />
  </g>
);
const ball = (cx: number, cy: number, key = "p") => (
  <circle key={key} cx={cx} cy={cy} r="8" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
);

const PANELS: Panel[] = [
  { prep: "auf", es: "sobre (con contacto)", draw: [box(), ball(52, 24)] },
  { prep: "über", es: "encima (sin contacto)", draw: [box(), ball(52, 8)] },
  { prep: "unter", es: "debajo de", draw: [box(30, 26), ball(50, 76)] },
  {
    prep: "in",
    es: "dentro de",
    draw: [
      box(),
      <circle key="p" cx="50" cy="53" r="8" fill="var(--accent)" opacity="0.85" />,
      <rect
        key="f"
        x="30"
        y="38"
        width="40"
        height="30"
        rx="3"
        fill="none"
        stroke="var(--ink-2)"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />,
    ],
  },
  { prep: "an", es: "junto a (tocando)", draw: [box(), ball(87, 52)] },
  { prep: "neben", es: "al lado de", draw: [box(18, 38), ball(88, 56)] },
  { prep: "vor", es: "delante de", draw: [box(), ball(46, 72)] },
  { prep: "hinter", es: "detrás de", draw: [ball(66, 34, "p"), box(30, 38, "b2")] },
  { prep: "zwischen", es: "entre", draw: [box(4, 40, "b1"), ball(50, 60), box(60, 40, "b3")] },
];

export function PrepositionsDiagram() {
  return (
    <figure aria-labelledby="prep-caption">
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {PANELS.map((p) => (
          <li
            key={p.prep}
            className="border-line bg-surface flex flex-col items-center rounded-md border px-1 py-2 text-center"
          >
            <svg
              viewBox="0 0 110 90"
              className="h-16 w-full sm:h-20"
              role="img"
              aria-label={`${p.prep}: ${p.es}`}
            >
              {p.draw}
            </svg>
            <span lang="de" className="font-serif text-lg font-semibold">
              {p.prep}
            </span>
            <span className="text-ink-2 text-[0.7rem] leading-tight">{p.es}</span>
          </li>
        ))}
      </ul>
      <figcaption id="prep-caption" className="text-ink-2 mt-2 text-xs">
        La pelota dorada es «la cosa» y la caja es el punto de referencia. Con <span lang="de">Wo?</span> las
        nueve van con dativo.
      </figcaption>
    </figure>
  );
}
