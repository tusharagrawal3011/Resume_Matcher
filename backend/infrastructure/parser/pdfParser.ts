import type { Buffer } from "buffer";
import { PDFParse } from "pdf-parse";

export async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const data = await parser.getText();

    if (!data.text || data.text.trim().length === 0) {
      throw new Error("Empty text extracted from PDF");
    }

    return data.text;
  } finally {
    await parser.destroy();
  }
}
