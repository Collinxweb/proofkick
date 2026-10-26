export const PRESETS = ["from-emerald-400 to-teal-600", "from-sky-400 to-indigo-600", "from-fuchsia-400 to-purple-600", "from-amber-400 to-orange-600", "from-rose-400 to-red-600", "from-lime-400 to-green-700"];
export default function Avatar({ url, name = "?", size = 40 }) {
  const style = { width: size, height: size };
  if (url?.startsWith("http")) return <img src={url} alt="" style={style} className="shrink-0 rounded-full object-cover" />;
  const g = PRESETS[Number(url?.split(":")[1])] ?? PRESETS[0];
  return <span style={style} className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${g} font-semibold uppercase text-black`}>{name[0]}</span>;
}
