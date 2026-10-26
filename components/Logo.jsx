export default function Logo({ size = 40 }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/logo.png" alt="ProofKick" width={size} height={size} />
      <span className="text-2xl font-bold tracking-tight text-white">Proof<span className="text-accent">Kick</span></span>
    </div>
  );
}
