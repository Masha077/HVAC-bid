import pdfParse from 'pdf-parse';
import { supabaseAdmin } from '../config/supabase';

export class DocumentParsingEngine {
  public static async parseDocument(
    documentId: string,
    fileName: string,
    fileBuffer?: Buffer
  ): Promise<{ text: string; isScanned: boolean }> {
    let extractedText = '';

    if (fileBuffer) {
      try {
        const parsed = await pdfParse(fileBuffer);
        extractedText = parsed.text || '';
      } catch (err: any) {
        console.warn(`[DocumentParser] Failed to parse native text from ${fileName}:`, err.message);
      }
    }

    // Determine if PDF is scanned or low density (< 50 words)
    const words = extractedText.trim().split(/\s+/).filter(Boolean);
    const isScanned = words.length < 50;

    if (isScanned && extractedText.length === 0) {
      extractedText = `Document ${fileName} uploaded. Scanned PDF document detected. Requires OCR analysis for complete engineering specification extraction.`;
    }

    return {
      text: extractedText,
      isScanned,
    };
  }

  public static async recordDocument(
    projectId: string,
    documentId: string,
    fileName: string,
    storagePath?: string
  ): Promise<void> {
    try {
      await supabaseAdmin.from('documents').insert({
        id: documentId,
        project_id: projectId,
        name: fileName,
        type: 'PDF',
        storage_path: storagePath || `projects/${projectId}/${fileName}`,
        status: 'Processed',
      });
    } catch {
      // Non-blocking if table not migrated
    }
  }
}
