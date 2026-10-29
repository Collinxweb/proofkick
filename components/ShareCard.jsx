"use client";
import { Share2, Download } from "lucide-react";

export default function ShareCard({ imageUrl, pageUrl, text }) {
  const enc = encodeURIComponent;
  const links = [
    ["WhatsApp", `https://wa.me/?text=${enc(`${text} ${pageUrl}`)}`],
    ["Telegram", `https://t.me/share/url?url=${enc(pageUrl)}&text=${enc(text)}`],
    ["X", `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(pageUrl)}`],
  ];
  const blob = async () => (await fetch(imageUrl)).blob();
  async function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await blob());
    a.download = "proofkick-slip.png";
    a.click();
  }
  async function share() {
    try {
      const file = new File([await blob()], "proofkick-slip.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: `${text} ${pageUrl}` });
      else await navigator.share({ text, url: pageUrl });
    } catch {}
  }
  const btn = "flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white";
  return (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={share} className={`${btn} border-accent text-accent`}><Share2 size={16} />Share</button>
      <button onClick={download} className={btn}><Download size={16} />Download</button>
      {links.map(([name, href]) => <a key={name} href={href} target="_blank" rel="noreferrer" className={btn}>{name}</a>)}
    </div>
  );
}
