import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import SlipCard from "@/lib/card/SlipCard";
import { demoSlip, loadPickSlip, loadSlipCard } from "@/lib/card/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function dataUri(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    return `data:${r.headers.get("content-type") ?? "image/png"};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch { return null; }
}

// /api/card/demo  |  /api/card/pick-<pickId>  |  /api/card/slip-<slipId>  ->  1080x1350 PNG share card
export async function GET(req, { params }) {
  const code = params.code;
  const slip = code === "demo" ? demoSlip()
    : code.startsWith("pick-") ? await loadPickSlip(code.slice(5))
    : code.startsWith("slip-") ? await loadSlipCard(code.slice(5))
    : null;
  if (!slip) return new Response("Not found", { status: 404 });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const target = slip.pickId ? `${site}/p/${slip.pickId}` : slip.slipId ? `${site}/t/${slip.slipId}` : site;
  const qr = await dataUri(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&format=png&data=${encodeURIComponent(target)}`);
  let logo = null;
  try { logo = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public", "logo.png")).toString("base64")}`; } catch {}
  const avatar = slip.avatarUrl?.startsWith("http") ? await dataUri(slip.avatarUrl) : null;
  return new ImageResponse(<SlipCard slip={slip} logo={logo} avatar={avatar} qr={qr} />, { width: 1080, height: 1350 });
}
