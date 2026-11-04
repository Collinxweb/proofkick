"use client";
import { Share2, Download } from "lucide-react";

// Share buttons used by every public page. Pass imageUrl for pages that have a card image; the download button only shows then.
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
    a.download = "proofkick-card.png";
    a.click();
  }
  async function share() {
    try {
      if (imageUrl) {
        const file = new File([await blob()], "proofkick-card.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], text: `${text} ${pageUrl}` });
      }
      if (navigator.share) return await navigator.share({ text, url: pageUrl });
      await navigator.clipboard.writeText(`${text} ${pageUrl}`);
    } catch {}
  }
  const btn = "flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white";
  return (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={share} className={`${btn} border-accent text-accent`}><Share2 size={16} />Share</button>
      {imageUrl && <button onClick={download} className={btn}><Download size={16} />Download</button>}
      {links.map(([name, href]) => <a key={name} href={href} target="_blank" rel="noreferrer" className={btn}>{name}</a>)}
    </div>
  );
}
