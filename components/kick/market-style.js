// Shared presentation for markets (no data logic).
export const PAIR = { BTC: "BTC/USD", ETH: "ETH/USD", PAXG: "XAU/PAXG" };
export const ICON = {
  BTC: { text: "₿", tint: "bg-[#f7931a]" },
  ETH: { text: "Ξ", tint: "bg-[#627eea]" },
  PAXG: { text: "Au", tint: "bg-[#d4a72c]" },
};
export const pct = (open, last) => (open && last ? ((last - open) / open) * 100 : null);
export const fmtPrice = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }));
