import Legal from "@/components/Legal";
export const metadata = { title: "Privacy Policy | ProofKick" };
const S = [
["1. What we collect","Account data: email address, sign-in provider details (such as Google name and profile basics), and a Sui wallet address if you connect one. Activity data: strategies, picks, follows, selected betting platforms and booking codes you create. Technical data: basic logs such as IP address, device and browser type, used for security and reliability."],
["2. What is public","Your handle, strategies, locked picks, results and statistics are public by default because verifiable records are the purpose of ProofKick. Your email address is never shown publicly."],
["3. Why we use it","To run your account, lock and settle picks, calculate records, prevent fraud and abuse, keep the service secure, and improve the product."],
["4. Walrus, Sui and permanence","To make records verifiable, hashes or copies of pick records may be stored using Walrus and anchored on the Sui network. Public blockchains and storage networks are permanent and cannot be edited or deleted by us. Do not put personal information in strategy names, notes or reasoning."],
["5. Who we share with","Service providers that run ProofKick, such as Supabase (database and authentication), Vercel (hosting), Google (sign-in), odds and fixtures data providers, and infrastructure providers for Sui and Walrus. We do not sell your personal data."],
["6. Retention","We keep account data while your account is active and for a reasonable period after for security and legal reasons. Locked pick records and their statistics may be kept to preserve the integrity of public track records."],
["7. Your choices","You can ask to access, correct or delete your account data, subject to the limits in sections 4 and 6. Contact us using the details below."],
["8. Children","ProofKick is for adults only (18+). We do not knowingly collect data from anyone under 18, and will delete such data if we learn of it."],
["9. Security","We use reasonable technical measures, but no system is perfectly secure. Protect your sign-in methods and wallet keys."],
["10. Changes and contact","We may update this policy and will post the new date here. Contact: [add your contact email and entity before launch]."],
];
export default function Privacy() { return <Legal title="Privacy Policy" updated="24 October 2026" sections={S} />; }
