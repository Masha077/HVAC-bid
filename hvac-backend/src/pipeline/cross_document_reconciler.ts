import { ConflictRecord, DocumentMetaRecord } from '../domain/models';

export class CrossDocumentReconciler {
  public static reconcile(
    projectId: string,
    reqText?: string,
    documentsMeta: DocumentMetaRecord[] = []
  ): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];
    let conflictCounter = 1;

    // Extract capacity values from text and documents
    const allSources: { docId: string; name: string; type: string; text: string }[] = [];

    if (reqText && reqText.trim().length > 0) {
      allSources.push({
        docId: 'REQ_INPUT',
        name: 'User Requirement Text',
        type: 'USER_REQUIREMENT',
        text: reqText,
      });
    }

    for (const doc of documentsMeta) {
      if (doc.extracted_text && doc.extracted_text.length > 0) {
        allSources.push({
          docId: doc.document_id,
          name: doc.file_name,
          type: doc.document_type,
          text: doc.extracted_text,
        });
      }
    }

    // Check for capacity conflicts (TR / Ton) across sources
    const capacityMatches: { source: string; tr: number; textSnippet: string }[] = [];
    for (const src of allSources) {
      const match = src.text.match(/(\d+(?:\.\d+)?)\s*(?:TR|Ton|tons|Tons)/i);
      if (match) {
        capacityMatches.push({
          source: src.name,
          tr: parseFloat(match[1]),
          textSnippet: match[0],
        });
      }
    }

    if (capacityMatches.length >= 2) {
      const first = capacityMatches[0];
      for (let i = 1; i < capacityMatches.length; i++) {
        const curr = capacityMatches[i];
        if (Math.abs(first.tr - curr.tr) > 0.01) {
          conflicts.push({
            conflict_id: `CONF-${projectId}-${conflictCounter++}`,
            project_id: projectId,
            document_a: first.source,
            document_b: curr.source,
            field: 'cooling_capacity_tr',
            value_a: `${first.tr} TR`,
            value_b: `${curr.tr} TR`,
            severity: 'HIGH',
            possible_interpretation: 'Source documents or requirements specify conflicting cooling capacity.',
            resolution_status: 'UNRESOLVED',
            required_action: 'Verify tender precedence rules or request clarification from client.',
          });
        }
      }
    }

    // Check for CFM / Fresh Air conflicts across sources
    const cfmMatches: { source: string; cfm: number; textSnippet: string }[] = [];
    for (const src of allSources) {
      const match = src.text.match(/(\d+(?:\.\d+)?)\s*(?:CFM|cfm)/i);
      if (match) {
        cfmMatches.push({
          source: src.name,
          cfm: parseFloat(match[1]),
          textSnippet: match[0],
        });
      }
    }

    if (cfmMatches.length >= 2) {
      const first = cfmMatches[0];
      for (let i = 1; i < cfmMatches.length; i++) {
        const curr = cfmMatches[i];
        if (Math.abs(first.cfm - curr.cfm) > 0.01) {
          conflicts.push({
            conflict_id: `CONF-${projectId}-${conflictCounter++}`,
            project_id: projectId,
            document_a: first.source,
            document_b: curr.source,
            field: 'fresh_air_cfm',
            value_a: `${first.cfm} CFM`,
            value_b: `${curr.cfm} CFM`,
            severity: 'HIGH',
            possible_interpretation: 'Source documents or requirements specify conflicting fresh air CFM requirements.',
            resolution_status: 'UNRESOLVED',
            required_action: 'Verify tender precedence rules or request clarification from client.',
          });
        }
      }
    }

    // Check for Voltage / Power Supply conflicts across sources
    const voltageMatches: { source: string; voltage: string }[] = [];
    for (const src of allSources) {
      const match = src.text.match(/(415V|230V|3Phase|1Phase|415\s*V|230\s*V)/i);
      if (match) {
        voltageMatches.push({
          source: src.name,
          voltage: match[0].toUpperCase(),
        });
      }
    }

    if (voltageMatches.length >= 2) {
      const first = voltageMatches[0];
      for (let i = 1; i < voltageMatches.length; i++) {
        const curr = voltageMatches[i];
        if (first.voltage !== curr.voltage) {
          conflicts.push({
            conflict_id: `CONF-${projectId}-${conflictCounter++}`,
            project_id: projectId,
            document_a: first.source,
            document_b: curr.source,
            field: 'voltage_supply',
            value_a: first.voltage,
            value_b: curr.voltage,
            severity: 'HIGH',
            possible_interpretation: 'Source documents or specifications contain conflicting electrical supply specifications.',
            resolution_status: 'UNRESOLVED',
            required_action: 'Verify electrical single-line diagram or request clarification from client engineer.',
          });
        }
      }
    }

    return conflicts;
  }
}
