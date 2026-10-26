"use client";
import { useState } from "react";
import ProfileGate from "@/components/ProfileGate";

export default function EditProfile({ userId, initial }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full border border-accent/50 px-5 py-2 text-sm text-accent">Edit profile</button>
      <ProfileGate open={open} userId={userId} initial={initial} onClose={() => setOpen(false)} />
    </>
  );
}
