import { NextResponse } from "next/server";
import { appendBooking } from "../../../lib/bookings";

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const datetime = String(form.get("datetime") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim() || null;

  if (!name || !email || !datetime) {
    return NextResponse.json({ error: "missing required fields" }, { status: 422 });
  }

  const isoDateTime = new Date(datetime).toISOString();

  try {
    await appendBooking({ name, email, datetime: isoDateTime, notes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }

  const url = new URL("/prenotazioni/thanks", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
