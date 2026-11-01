"use client";
import { useEffect } from "react";
import { markNotificationsRead } from "@/app/social-actions";

export default function MarkRead({ unread }) {
  useEffect(() => { if (unread) markNotificationsRead(); }, [unread]);
  return null;
}
