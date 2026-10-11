import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Citation {
  source_id: string;
  chunk_id: number;
  document_id: number;
  title: string;
  source_url: string | null;
  page_start: number;
  page_end: number;
  section: string;
  snippet: string;
  rerank_score: number | null;
}

export interface AnswerSentence {
  text: string;
  citations: string[];
  status: 'supported' | 'unsupported' | 'uncited' | 'unverified';
  entailment: number | null;
  invalid_citations: string[];
}

export interface AskResponse {
  question: string;
  verdict: 'verified' | 'partially_verified' | 'unverified' | 'abstained';
  answer: AnswerSentence[];
  groundedness: number | null;
  abstain_reason: string | null;
  citations: Citation[];
  timings_ms: Record<string, number>;
  config: Record<string, string | number | boolean>;
}

export interface DocumentOut {
  id: number;
  title: string;
  source_url: string | null;
  license: string | null;
  pages: number;
  chunks: number;
}

export interface IngestOut {
  document_id: number;
  title: string;
  pages: number;
  chunks: number;
  suspicious_chunks: number;
  already_existed: boolean;
}

export interface StatsOut {
  queries: number;
  verified: number;
  partially_verified: number;
  unverified: number;
  abstained: number;
  avg_groundedness: number;
  p50_ms: number;
  p95_ms: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ask(question: string, options?: { 
    retrieval_mode?: 'dense' | 'fts' | 'hybrid'; 
    top_k?: number; 
    verify?: boolean;
    document_ids?: number[];
    force_answer?: boolean;
  }): Observable<AskResponse> {
    return this.http.post<AskResponse>(`${this.baseUrl}/ask`, { question, ...options });
  }

  listDocuments(): Observable<DocumentOut[]> {
    return this.http.get<DocumentOut[]>(`${this.baseUrl}/documents`);
  }

  uploadDocument(file: File, title: string, source_url?: string, license?: string): Observable<IngestOut> {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    if (source_url) form.append('source_url', source_url);
    if (license) form.append('license', license);
    return this.http.post<IngestOut>(`${this.baseUrl}/documents`, form);
  }

  deleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/documents/${id}`);
  }

  getStats(): Observable<StatsOut> {
    return this.http.get<StatsOut>(`${this.baseUrl}/stats`);
  }
}