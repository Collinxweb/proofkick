import Legal from "@/components/Legal";
export const metadata = { title: "Terms of Service | ProofKick" };
const S = [
["1. About ProofKick","ProofKick is a reputation layer for football predictions. Users post calls before kick-off, each call is timestamped and saved, and results are graded to build a public record. ProofKick is not a bookmaker or betting service, does not accept bets, and never holds, transfers or manages user money."],
["2. Eligibility (18+)","You must be at least 18 years old to use ProofKick. If you are under 18 you must not create an account. We may suspend accounts we reasonably believe belong to minors."],
["3. Predictions are opinions","Calls, hit rates, closing-line value and other statistics are for information and entertainment. They are not financial, investment or betting advice. Past performance does not predict future results. ProofKick does not promise that any caller or call will be right."],
["4. Your account","Keep your sign-in details secure. You are responsible for activity on your account. Provide accurate information and do not impersonate others or run multiple accounts to mislead other users about your record."],
["5. Calls and public records","A call is locked before kick-off and cannot be edited or deleted. Your username, calls, results and statistics are public by default. Verification data may be stored on third-party networks such as Walrus and Sui, which are public and permanent by design."],
["6. Grading","Results come from a match-data source, or, for the demo slate, from manual grading that is labelled as such on each graded call. Voided matches are not counted as losses. We may correct a grade if source data was wrong, and we do not guarantee accuracy."],
["7. Acceptable use","Do not manipulate records, abuse or overload the service, scrape it at scale, attempt to access other accounts, post unlawful or misleading content, or inflate likes or follows with fake accounts."],
["8. Third-party data","Fixtures, odds and results come from third-party providers and may be delayed, incomplete or wrong."],
["9. Disclaimers and liability","ProofKick is provided as is and as available. To the extent permitted by law, we are not liable for losses, lost profits, or indirect or consequential damages arising from your use of the service or reliance on any call or statistic."],
["10. Termination","You may stop using ProofKick at any time. We may suspend or end access for breach of these terms or to protect the service. Locked calls and anchored records may remain visible after account closure."],
["11. Changes and contact","We may update these terms and will post the new date here. Continued use means you accept the update. Governing law and contact: [add your legal entity, country and contact email before launch]."],
];
export default function Terms() { return <Legal title="Terms of Service" updated="24 October 2026" sections={S} />; }
