// A small price line. Green when the last price is above the first, red when below.
export default function Spark({ values = [] }) {
  if (values.length < 2) return <div className="h-10 w-28" />;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 112},${36 - ((v - min) / span) * 32}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox="0 0 112 40" className="h-10 w-28" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={up ? "#19d36b" : "#f87171"} strokeWidth="2" />
    </svg>
  );
}
