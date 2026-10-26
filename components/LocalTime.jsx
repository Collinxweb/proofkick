"use client";
export default function LocalTime({ iso }) {
  return <time dateTime={iso} suppressHydrationWarning>{new Date(iso).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}</time>;
}
