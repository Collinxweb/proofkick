import Link from "next/link";

// Profile editing now lives in Settings, where name, date of birth, country, photo, username and bio are one form.
export default function EditProfile({ children, className }) {
  return <Link href="/settings" className={className ?? "rounded-full border border-accent/50 px-5 py-2 text-sm text-accent"}>{children ?? "Edit profile"}</Link>;
}
