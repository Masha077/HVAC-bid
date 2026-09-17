import pdfParse from 'pdf-parse';
import { DocumentMetaRecord, DocumentProcessingStatus, FactProvenance } from '../domain/models';

export interface DocumentInputItem {
  document_id?: string;
  file_name: string;
  document_type?: string;
  revision_number?: number;
  parent_document_id?: string;
  storage_path?: string;
  file_url?: string;
  content_base64?: string;
  binary?: string;
  raw_text?: string;
  extracted_text?: string;
}

export class DocumentIntakeStage {
  public static async processDocuments(
    projectId: string,
    documents: DocumentInputItem[],
    fileBuffers?: Buffer[]
  ): Promise<{
    combinedText: string;
    documentsMeta: DocumentMetaRecord[];
    factProvenance: FactProvenance[];
    successfulCount: number;
    failedCount: number;
  }> {
    let combinedText = '';
    const documentsMeta: DocumentMetaRecord[] = [];
    const factProvenance: FactProvenance[] = [];
    let successfulCount = 0;
    let failedCount = 0;

    // Detect superseded revisions: if a new document has parent_document_id or matching file_name with higher revision_number
    const docMap = new Map<string, number>();
    documents.forEach((d) => {
      const key = d.parent_document_id || d.file_name;
      const rev = d.revision_number || 1;
      const existing = docMap.get(key) || 0;
      if (rev > existing) {
        docMap.set(key, rev);
      }
    });

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const docId = doc.document_id || `DOC-${Date.now()}-${i + 1}`;
      const fileName = doc.file_name || `document_${i + 1}.pdf`;
      const docType = doc.document_type || 'OTHER';
      const revNum = doc.revision_number || 1;
      const parentId = doc.parent_document_id;

      const latestRev = docMap.get(parentId || fileName) || 1;
      const isSuperseded = revNum < latestRev;

      let docStatus: DocumentProcessingStatus = isSuperseded ? 'SUPERSEDED' : 'DOCUMENT_RECEIVED';
      let extractedText = '';
      let errorMsg: string | undefined = undefined;

      try {
        const directText = doc.extracted_text || doc.raw_text;
        if (directText && directText.trim().length > 0) {
          extractedText = directText;
          docStatus = isSuperseded ? 'SUPERSEDED' : 'TEXT_EXTRACTED';
        } else if (doc.content_base64 || doc.binary) {
          const rawBase64 = doc.content_base64 || (doc.binary && doc.binary.includes('base64,') ? doc.binary.split('base64,')[1] : doc.binary) || '';
          const buf = Buffer.from(rawBase64, 'base64');
          const parsed = await pdfParse(new Uint8Array(buf) as unknown as Buffer);
          extractedText = parsed.text || '';
          docStatus = isSuperseded ? 'SUPERSEDED' : extractedText.trim().split(/\s+/).length < 30 ? 'OCR_REQUIRED' : 'TEXT_EXTRACTED';
        } else if (fileBuffers && fileBuffers[i]) {
          const parsed = await pdfParse(new Uint8Array(fileBuffers[i]) as unknown as Buffer);
          extractedText = parsed.text || '';
          docStatus = isSuperseded ? 'SUPERSEDED' : extractedText.trim().split(/\s+/).length < 30 ? 'OCR_REQUIRED' : 'TEXT_EXTRACTED';
        } else {
          extractedText = `Attached metadata reference for file: ${fileName} (Type: ${docType}).`;
          docStatus = isSuperseded ? 'SUPERSEDED' : 'TEXT_EXTRACTED';
        }

        if (!isSuperseded) docStatus = 'VALIDATION_COMPLETED';
        successfulCount++;

        // Fact Provenance extraction
        const lines = extractedText.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes(':') || line.match(/\d+/)) {
            factProvenance.push({
              fact_id: `FACT-${docId}-${idx + 1}`,
              project_id: projectId,
              document_id: docId,
              file_name: fileName,
              document_type: docType,
              page_number: Math.floor(idx / 30) + 1,
              source: `${fileName} (Rev ${revNum})`,
              field_name: 'extracted_text_line',
              value: line.trim(),
              status: isSuperseded ? 'SUPERSEDED' as any : 'SOURCE_FACT',
            });
          }
        });
      } catch (err: any) {
        docStatus = 'FAILED';
        errorMsg = err.message || 'PDF parsing failure';
        failedCount++;
      }

      documentsMeta.push({
        document_id: docId,
        file_name: fileName,
        document_type: docType,
        revision_number: revNum,
        parent_document_id: parentId,
        is_superseded: isSuperseded,
        storage_path: doc.storage_path,
        file_url: doc.file_url,
        status: docStatus,
        extracted_word_count: extractedText.trim().split(/\s+/).filter(Boolean).length,
        extracted_text: extractedText,
        error: errorMsg,
      });

      if (extractedText.length > 0 && !isSuperseded) {
        combinedText += `\n=== START DOCUMENT [ID: ${docId} | Name: ${fileName} | Type: ${docType} | Rev: ${revNum}] ===\n${extractedText}\n=== END DOCUMENT ===\n`;
      }
    }

    return {
      combinedText,
      documentsMeta,
      factProvenance,
      successfulCount,
      failedCount,
    };
  }
}
