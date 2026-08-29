export type DocumentStatus = 'Verified' | 'Pending' | 'Under Review' | 'Draft' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export type DocumentSource = 'UGC' | 'NIE' | 'MoHE' | 'DoE' | 'Other';

export type DocumentType = 'Admissions' | 'Curriculum' | 'Cutoff Ranks' | 'Syllabus' | 'Requirements' | 'General Policy';

export interface DocumentItem {
  id: string | number;
  title: string;
  pages?: number;
  totalPages?: number;
  fileSize?: string;
  fileName?: string;
  source: DocumentSource | string;
  academicYear: string;
  type: DocumentType | string;
  documentType?: string;
  status: DocumentStatus;
  uploadedAt: string;
  lastUpdated?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  storagePath?: string;
  description?: string;
}

export interface DocumentPageItem {
  id: number;
  documentId: number;
  pageNumber: number;
  extractedText: string;
  hasTables?: boolean;
  createdAt?: string;
}

export interface DocumentUploadPayload {
  title: string;
  source: string;
  academicYear: string;
  documentType: string;
  description?: string;
  file: File;
}

