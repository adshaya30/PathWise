import type { DocumentItem, DocumentPageItem, DocumentUploadPayload } from '../types/document';
import { authApiService } from './authApiService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/admin/documents';

export interface DocumentFilterParams {
  source?: string;
  academicYear?: string;
  status?: string;
  documentType?: string;
  query?: string;
}

/**
 * Helper to execute fetch with JWT token and auto-refresh on 401
 */
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = authApiService.getStoredToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  let response = await fetch(url, fetchOptions);

  // If 401 Unauthorized, attempt a silent token refresh and retry once
  if (response.status === 401) {
    try {
      const refreshed = await authApiService.refreshToken();
      if (refreshed?.accessToken) {
        headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
        response = await fetch(url, { ...fetchOptions, headers });
      }
    } catch {
      // Refresh failed
    }
  }

  return response;
}

export const documentApiService = {
  /**
   * Get all documents with optional filters
   */
  async getDocuments(params?: DocumentFilterParams): Promise<DocumentItem[]> {
    const url = new URL(API_BASE_URL);
    if (params) {
      if (params.source && params.source !== 'All') url.searchParams.append('source', params.source);
      if (params.academicYear && params.academicYear !== 'All') url.searchParams.append('academicYear', params.academicYear);
      if (params.status && params.status !== 'All') {
        const backendStatus = params.status === 'Verified' ? 'APPROVED'
          : params.status === 'Pending' ? 'PENDING_REVIEW'
          : params.status;
        url.searchParams.append('status', backendStatus);
      }
      if (params.documentType && params.documentType !== 'All') url.searchParams.append('documentType', params.documentType);
      if (params.query) url.searchParams.append('query', params.query);
    }

    const response = await authFetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map((doc: any) => ({
      ...doc,
      pages: doc.totalPages || doc.pages || 0,
      type: doc.documentType || doc.type || 'Admissions',
      lastUpdated: doc.reviewedAt || doc.uploadedAt,
    }));
  },

  /**
   * Upload a new official document
   */
  async uploadDocument(payload: DocumentUploadPayload, signal?: AbortSignal): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('title', payload.title);
    formData.append('source', payload.source);
    formData.append('academicYear', payload.academicYear);
    formData.append('documentType', payload.documentType || 'Admissions');
    if (payload.description) {
      formData.append('description', payload.description);
    }

    const response = await authFetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Upload failed with status ${response.status}`);
    }

    const doc = await response.json();
    return {
      ...doc,
      pages: doc.totalPages || 0,
      type: doc.documentType || 'Admissions',
      lastUpdated: doc.uploadedAt,
    };
  },

  /**
   * Get extracted pages for a document
   */
  async getDocumentPages(documentId: string | number): Promise<DocumentPageItem[]> {
    const response = await authFetch(`${API_BASE_URL}/${documentId}/pages`);
    if (!response.ok) {
      throw new Error(`Failed to fetch document pages: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Update Document Status (Approve / Reject review workflow)
   */
  async updateStatus(
    documentId: string | number,
    status: 'APPROVED' | 'REJECTED' | 'PENDING_REVIEW' | 'DRAFT',
    notes?: string,
    reviewedBy: string = 'PathWise Admin'
  ): Promise<DocumentItem> {
    const response = await authFetch(`${API_BASE_URL}/${documentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        notes,
        reviewedBy,
      }),
    });

    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errorJson = await response.json();
        errorMsg = errorJson.message || errorJson.error || response.statusText;
      } catch {
        // use fallback statusText
      }
      throw new Error(errorMsg || `Failed with HTTP ${response.status}`);
    }
    const doc = await response.json();
    return {
      ...doc,
      pages: doc.totalPages || 0,
      type: doc.documentType || 'Admissions',
      lastUpdated: doc.reviewedAt || doc.uploadedAt,
    };
  },

  /**
   * Update metadata
   */
  async updateMetadata(
    documentId: string | number,
    data: { title: string; source: string; academicYear: string; documentType?: string; description?: string }
  ): Promise<DocumentItem> {
    const response = await authFetch(`${API_BASE_URL}/${documentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update document: ${response.statusText}`);
    }
    const doc = await response.json();
    return {
      ...doc,
      pages: doc.totalPages || 0,
      type: doc.documentType || 'Admissions',
      lastUpdated: doc.uploadedAt,
    };
  },

  /**
   * Update extracted text for a specific page (Human correction)
   */
  async updatePageText(
    documentId: string | number,
    pageNumber: number,
    extractedText: string
  ): Promise<DocumentPageItem> {
    const response = await authFetch(`${API_BASE_URL}/${documentId}/pages/${pageNumber}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extractedText }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update page text: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Delete document
   */
  async deleteDocument(documentId: string | number): Promise<void> {
    const response = await authFetch(`${API_BASE_URL}/${documentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.statusText}`);
    }
  },

  /**
   * AI Auto-Extract Cutoff Table from a specific PDF page
   */
  async aiExtractPageTable(
    documentId: string | number,
    pageNumber: number
  ): Promise<DocumentPageItem> {
    const response = await authFetch(`${API_BASE_URL}/${documentId}/pages/${pageNumber}/ai-extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to AI auto-extract page table: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Bulk AI Auto-Extract ALL Cutoff Table pages in the document
   */
  async aiExtractAllTables(
    documentId: string | number
  ): Promise<DocumentPageItem[]> {
    const response = await authFetch(`${API_BASE_URL}/${documentId}/ai-extract-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to bulk AI auto-extract tables: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get PDF download URL
   */
  getDocumentDownloadUrl(documentId: string | number): string {
    return `${API_BASE_URL}/${documentId}/download`;
  }
};
