import { UniversalRequest, UniversalRequestSchema } from '../validators/schemas';

export class RequestEntryStage {
  public static process(rawPayload: any): { valid: boolean; data?: UniversalRequest; error?: string } {
    const parseResult = UniversalRequestSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      return {
        valid: false,
        error: `Validation error: ${parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
      };
    }
    return {
      valid: true,
      data: parseResult.data,
    };
  }
}
