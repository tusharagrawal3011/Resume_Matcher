import type { Buffer } from "buffer";

const pdfParse = require("pdf-parse");

export async function parsePdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);

  if (!data.text || data.text.trim().length === 0) {
    throw new Error("Empty text extracted from PDF");
  }

  return data.text;
}
