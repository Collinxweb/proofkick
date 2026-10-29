import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import SlipCard from "@/lib/card/SlipCard";
import { demoSlip, loadPickSlip } from "@/lib/card/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function dataUri(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    return `data:${r.headers.get("content-type") ?? "image/png"};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch { return null; }
}

// /api/card/demo  |  /api/card/pick-<pickId>   ->  1080x1350 PNG share card
export async function GET(req, { params }) {
  const code = params.code;
  const slip = code === "demo" ? demoSlip() : code.startsWith("pick-") ? await loadPickSlip(code.slice(5)) : null;
  if (!slip) return new Response("Not found", { status: 404 });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const q = QRCode.create(slip.pickId ? `${site}/p/${slip.pickId}` : site, { errorCorrectionLevel: "M" });
  const n = q.modules.size;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.modules.get(r, c)) d += `M${c} ${r}h1v1h-1z`;
  let logo = null;
  try { logo = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public", "logo.png")).toString("base64")}`; } catch {}
  const avatar = slip.avatarUrl?.startsWith("http") ? await dataUri(slip.avatarUrl) : null;
  return new ImageResponse(<SlipCard slip={slip} logo={logo} avatar={avatar} qr={{ n, d }} />, { width: 1080, height: 1350 });
}
