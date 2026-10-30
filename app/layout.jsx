import "./globals.css";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });
export const metadata = { title: "ProofKick", description: "The reputation layer for football predictions. Anyone can make a call. Nobody can fake their record.", icons: { icon: "/logo.png" } };
export default function RootLayout({ children }) {
  return (<html lang="en"><body className={inter.className}>{children}</body></html>);
}
