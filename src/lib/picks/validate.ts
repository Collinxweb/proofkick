// Server-side pick validation: kickoff gating + rules check, used by the pick API route
// alongside the DB trigger (belt and braces).
export function assertLoggable(kickoffIso: string, now: Date = new Date()): void {
  const ko = new Date(kickoffIso).getTime();
  if (Number.isNaN(ko)) throw new PickError("invalid kickoff_time");
  if (now.getTime() >= ko) throw new PickError("kickoff has passed; pick not loggable");
}

export class PickError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PickError";
  }
}
