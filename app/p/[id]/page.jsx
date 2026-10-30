import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Logo from "@/components/Logo";
import ShareCard from "@/components/ShareCard";

export const revalidate = 60;
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://proofkick-one.vercel.app";
const anon = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

async function load(id) {
  const sb = anon();
  const { data: p } = await sb.from("picks").select("id, user_id, selection, anchor_digest, status, fixtures(home_team, away_team)").eq("id", id).maybeSingle();
  if (!p) return null;
  const { data: prof } = await sb.from("profiles").select("handle").eq("id", p.user_id).maybeSingle();
  return { p, handle: prof?.handle };
}

export async function generateMetadata({ params }) {
  const d = await load(params.id);
  const title = d ? `${d.p.fixtures?.home_team} vs ${d.p.fixtures?.away_team} · @${d.handle} on ProofKick` : "ProofKick pick";
  const image = `${site()}/api/card/pick-${params.id}`;
  return { metadataBase: new URL(site()), title, description: "A pick locked before kick-off. Check the record.",
    openGraph: { title, images: [{ url: image, width: 1080, height: 1350 }] }, twitter: { card: "summary_large_image", title, images: [image] } };
}

export default async function PickPage({ params }) {
  const d = await load(params.id);
  if (!d) notFound();
  const pageUrl = `${site()}/p/${params.id}`;
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-5">
      <Link href="/"><Logo size={32} /></Link>
      <img src={`/api/card/pick-${params.id}`} alt="Prediction slip" className="mt-6 w-full rounded-2xl border border-white/10" />
      <div className="mt-4"><ShareCard imageUrl={`/api/card/pick-${params.id}`} pageUrl={pageUrl} text={`${d.p.fixtures?.home_team} vs ${d.p.fixtures?.away_team}: my pick, locked before kick-off on ProofKick.`} /></div>
      {d.p.anchor_digest && <a href={`https://suiscan.xyz/mainnet/tx/${d.p.anchor_digest}`} target="_blank" rel="noreferrer" className="mt-4 block break-all text-center text-xs text-accent underline">Timestamped on Sui · tx {d.p.anchor_digest}</a>}
      {d.handle && <Link href={`/u/${d.handle}`} className="mt-5 block text-center text-sm text-accent underline">See the full record of @{d.handle}</Link>}
    </main>
  );
}
