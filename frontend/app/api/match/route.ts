import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL?.trim() || "http://127.0.0.1:3000";
const API_KEY = process.env.API_KEY?.trim() ?? "";

export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(`${BACKEND_URL}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
    body
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
