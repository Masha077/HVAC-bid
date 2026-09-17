export interface UniversalRequestPayload {
  project_id?: string;
  user_id?: string;
  mode: 'REQUIREMENT_DRIVEN' | 'DOCUMENT_DRIVEN' | 'HYBRID';
  requested_output_type?: string;
  text?: string;
  documents?: {
    document_id?: string;
    file_name: string;
    document_type?: string;
    revision_number?: number;
    extracted_text?: string;
    raw_text?: string;
    content_base64?: string;
  }[];
}

export class HVACApiClient {
  private static getBaseUrl(): string {
    const envUrl =
      import.meta.env.VITE_BACKEND_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      '';
    if (envUrl && envUrl.trim().length > 0) {
      return envUrl.replace(/\/+$/, '');
    }
    // Default fallback for local development
    return 'http://localhost:3001';
  }

  public static async executeWorkflow(payload: UniversalRequestPayload): Promise<any> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/api/v1/webhook`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      console.error('[HVACApiClient] Workflow execution failed:', err);
      throw err;
    }
  }

  public static async getProject(projectId: string): Promise<any> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/api/v1/hvac/projects/${projectId}`;
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Project fetch failed with status ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      console.error(`[HVACApiClient] getProject failed for ${projectId}:`, err);
      throw err;
    }
  }

  public static async listProjects(): Promise<any[]> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/api/v1/hvac/projects`;
    try {
      const response = await fetch(endpoint);
      if (!response.ok) return [];
      const res = await response.json();
      return res.data || [];
    } catch {
      return [];
    }
  }

  public static async listDocuments(): Promise<any[]> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/api/v1/hvac/documents`;
    try {
      const response = await fetch(endpoint);
      if (!response.ok) return [];
      const res = await response.json();
      return res.data || [];
    } catch {
      return [];
    }
  }

  public static downloadPdfBlob(pdfBase64: string, filename: string): void {
    if (!pdfBase64) return;
    const cleanBase64 = (pdfBase64.includes('base64,')
      ? pdfBase64.split('base64,')[1]
      : pdfBase64).replace(/\s+/g, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }
}
