// Append-only booking store: writes to a JSON file on disk. The path lives at
// /app/data/bookings.json — pair with a Coolify persistent volume mount on /app/data
// or accept that bookings vanish on redeploy (which is exactly the point of the
// CMS-less variant).

import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR ?? "/app/data";
const FILE = path.join(DATA_DIR, "bookings.json");

export type Booking = {
  id: string;
  name: string;
  email: string;
  datetime: string;
  notes: string | null;
  status: "new" | "confirmed" | "cancelled";
  createdAt: string;
};

async function readAll(): Promise<Booking[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Booking[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function appendBooking(b: Omit<Booking, "id" | "createdAt" | "status">): Promise<Booking> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const all = await readAll();
  const entry: Booking = {
    ...b,
    id: crypto.randomUUID(),
    status: "new",
    createdAt: new Date().toISOString(),
  };
  all.push(entry);
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
  return entry;
}
