import {
  IngestionStatusResponse,
  MatchRequest,
  MatchResponse,
  UploadRequest,
  UploadResponse
} from "@/types/match";

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

export async function uploadResumes(payload: UploadRequest): Promise<UploadResponse> {
  const response = await fetch("/api/ingest-resumes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new ApiError("Failed to queue resume ingestion", response.status, details);
  }

  return response.json();
}

export async function matchResumes(payload: MatchRequest): Promise<MatchResponse> {
  const response = await fetch("/api/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new ApiError("Failed to match resumes", response.status, details);
  }

  return response.json();
}

export async function getIngestionStatus(jobId: string | number): Promise<IngestionStatusResponse> {
  const response = await fetch(`/api/ingest-resumes/${jobId}/status`);

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    throw new ApiError("Failed to fetch ingestion status", response.status, details);
  }

  return response.json();
}
