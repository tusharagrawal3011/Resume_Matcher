import {
  IngestionStatusResponse,
  MatchRequest,
  MatchResponse,
  UploadRequest,
  UploadResponse
} from "@/types/match";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:3000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

async function parseErrorResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey
  };
}

export async function uploadResumes(
  payload: UploadRequest,
  apiKey: string
): Promise<UploadResponse> {
  const response = await fetch(`${API_BASE_URL}/ingest-resumes`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new ApiError("Failed to queue resume ingestion", response.status, details);
  }

  return response.json();
}

export async function matchResumes(
  payload: MatchRequest,
  apiKey: string
): Promise<MatchResponse> {
  const response = await fetch(`${API_BASE_URL}/match`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new ApiError("Failed to match resumes", response.status, details);
  }

  return response.json();
}

export async function getIngestionStatus(
  jobId: string | number,
  apiKey: string
): Promise<IngestionStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/ingest-resumes/${jobId}/status`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey
    }
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new ApiError("Failed to fetch ingestion status", response.status, details);
  }

  return response.json();
}
