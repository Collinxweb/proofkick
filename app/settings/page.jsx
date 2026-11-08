import BottomNav from "@/components/BottomNav";
import ContactSupport from "@/components/support/ContactSupport";
import DocsLink from "@/components/support/DocsLink";
export default function X() {
  return (
    <main>
      <div className="mt-6"><DocsLink /></div>
      <div className="mt-6"><ContactSupport /></div>
      <BottomNav />
    </main>
  );
}
