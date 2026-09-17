import { UniversalRequest } from '../validators/schemas';
import { WorkflowMode } from '../domain/models';

export class ModeRouterStage {
  public static route(request: UniversalRequest): {
    mode: WorkflowMode;
    isRequirement: boolean;
    isDocument: boolean;
    isHybrid: boolean;
    hasText: boolean;
    hasDocs: boolean;
    conflictWarning?: string;
  } {
    const hasText = Boolean(request.text && request.text.trim().length > 0);
    const hasDocs = Boolean(request.documents && request.documents.length > 0);

    let actualMode: WorkflowMode = 'REQUIREMENT_DRIVEN';
    if (hasText && !hasDocs) {
      actualMode = 'REQUIREMENT_DRIVEN';
    } else if (!hasText && hasDocs) {
      actualMode = 'DOCUMENT_DRIVEN';
    } else if (hasText && hasDocs) {
      actualMode = 'HYBRID';
    } else {
      actualMode = request.mode || 'REQUIREMENT_DRIVEN';
    }

    let conflictWarning: string | undefined = undefined;
    if (request.mode && request.mode !== actualMode) {
      conflictWarning = `Mode Conflict Warning: Supplied mode '${request.mode}' conflicts with actual input (hasText: ${hasText}, hasDocs: ${hasDocs}). Overriding route to '${actualMode}'.`;
      console.warn(`[ModeRouterStage] ${conflictWarning}`);
    }

    return {
      mode: actualMode,
      isRequirement: actualMode === 'REQUIREMENT_DRIVEN',
      isDocument: actualMode === 'DOCUMENT_DRIVEN',
      isHybrid: actualMode === 'HYBRID',
      hasText,
      hasDocs,
      conflictWarning,
    };
  }
}

