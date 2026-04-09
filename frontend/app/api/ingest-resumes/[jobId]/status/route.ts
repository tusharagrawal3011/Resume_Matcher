import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL?.trim() || "http://127.0.0.1:3000";
const API_KEY = process.env.API_KEY?.trim() ?? "";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const upstream = await fetch(`${BACKEND_URL}/ingest-resumes/${jobId}/status`, {
    headers: { "x-api-key": API_KEY }
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
