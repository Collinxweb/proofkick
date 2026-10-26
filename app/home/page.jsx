import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import LiveStrategies from "@/components/home/LiveStrategies";
import FeatureTiles from "@/components/home/FeatureTiles";
import BottomNav from "@/components/home/BottomNav";

export default function Home() {
  return (
    <main className="min-h-screen bg-ink pb-24 text-white">
      <Header />
      <Hero />
      <LiveStrategies />
      <FeatureTiles />
      <BottomNav />
    </main>
  );
}
