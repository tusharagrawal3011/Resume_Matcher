import type { Buffer } from "node:buffer";
import { FormatError, InvalidPDFException, PDFParse, PasswordException } from "pdf-parse";

export async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    let data;
    try {
      data = await parser.getText();
    } catch (parseError) {
      if (parseError instanceof PasswordException) {
        throw new Error("PDF is password-protected and cannot be parsed");
      }
      if (parseError instanceof InvalidPDFException) {
        throw new Error("File is not a valid PDF");
      }
      if (parseError instanceof FormatError) {
        throw new Error(`PDF is malformed and cannot be parsed: ${(parseError as Error).message}`);
      }
      throw parseError;
    }

    if (!data.text || data.text.trim().length === 0) {
      throw new Error("No text content found in PDF");
    }

    return data.text;
  } finally {
    // Suppress destroy errors so they don't mask the original error
    try {
      await parser.destroy();
    } catch {
      // ignore
    }
  }
}
