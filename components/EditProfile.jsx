"use client";
import { useState } from "react";
import ProfileGate from "@/components/ProfileGate";

// Opens the profile editor. Pass children to use your own trigger (for example the avatar pencil or a full-width button).
export default function EditProfile({ userId, initial, children, className }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {children ? (
        <span onClick={() => setOpen(true)} className={className}>{children}</span>
      ) : (
        <button onClick={() => setOpen(true)} className={className ?? "rounded-full border border-accent/50 px-5 py-2 text-sm text-accent"}>Edit profile</button>
      )}
      <ProfileGate open={open} userId={userId} initial={initial} onClose={() => setOpen(false)} />
    </>
  );
}
