import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, DocumentOut, IngestOut, StatsOut } from '../api.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="documents-section">
      <h2>Documents</h2>

      <!-- Stats -->
      @if (stats()) {
        <div class="stats-grid glass-card">
          <div class="stat-card">
            <span class="stat-value">{{ stats()!.queries }}</span>
            <span class="stat-label">Total queries</span>
          </div>
          <div class="stat-card">
            <span class="stat-value stat-success">{{ stats()!.verified }}</span>
            <span class="stat-label">Verified</span>
          </div>
          <div class="stat-card">
            <span class="stat-value stat-warning">{{ stats()!.partially_verified }}</span>
            <span class="stat-label">Partially</span>
          </div>
          <div class="stat-card">
            <span class="stat-value stat-error">{{ stats()!.unverified }}</span>
            <span class="stat-label">Unverified</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats()!.abstained }}</span>
            <span class="stat-label">Abstained</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats()!.avg_groundedness }}</span>
            <span class="stat-label">Groundedness</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats()!.p50_ms }}ms</span>
            <span class="stat-label">P50 latency</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats()!.p95_ms }}ms</span>
            <span class="stat-label">P95 latency</span>
          </div>
        </div>
      }

      <!-- Upload section -->
      <h3>Upload PDF</h3>

      <!-- Drag & drop zone -->
      <div
        class="upload-zone"
        [class.drag-over]="isDragOver()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
        tabindex="0"
        role="button"
        aria-label="Upload PDF file. Click or drag and drop a PDF file here."
        (keydown.enter)="fileInput.click()"
        (keydown.space)="fileInput.click()"
      >
        <div class="upload-zone-content">
          <svg class="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
               stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p class="upload-text">
            <strong>Click to upload</strong> or drag and drop
          </p>
          <p class="upload-subtext">PDF files up to 50MB</p>
        </div>
        <input
          type="file"
          #fileInput
          accept=".pdf"
          hidden
          (change)="onFileSelect($event)"
          aria-label="Choose PDF file"
        />
      </div>

      <!-- File preview -->
      @if (selectedFile()) {
        <div class="file-preview glass-card slide-in">
          <div class="file-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                 stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div class="file-info">
            <p class="file-name">{{ selectedFile()!.name }}</p>
            <p class="file-meta">
              {{ formatFileSize(selectedFile()!.size) }} •
              Last modified: {{ selectedFile()!.lastModified | date:'medium' }}
            </p>
          </div>
          <button
            type="button"
            class="btn-icon btn-danger"
            (click)="removeFile()"
            aria-label="Remove selected file"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round"
                 stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      }

      <!-- Upload form -->
      @if (selectedFile()) {
        <form (ngSubmit)="onUpload()" class="upload-form">
          <div class="form-row">
            <label for="doc-title">Title</label>
            <input
              id="doc-title"
              type="text"
              [(ngModel)]="title"
              name="title"
              placeholder="Document title"
              required
              [disabled]="uploading()"
            />
          </div>
          <div class="form-row">
            <label for="doc-source">Source URL (optional)</label>
            <input
              id="doc-source"
              type="text"
              [(ngModel)]="sourceUrl"
              name="source_url"
              placeholder="https://example.com/document.pdf"
              [disabled]="uploading()"
            />
          </div>
          <div class="form-row">
            <label for="doc-license">License (optional)</label>
            <input
              id="doc-license"
              type="text"
              [(ngModel)]="license"
              name="license"
              placeholder="e.g., CC BY-NC-SA 3.0 IGO"
              [disabled]="uploading()"
            />
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="removeFile()" [disabled]="uploading()">
              Cancel
            </button>
            <button type="submit" class="btn-primary" [disabled]="uploading() || !title.trim()">
              @if (uploading()) {
                <span class="spinner" style="width:16px;height:16px;border-width:2px;margin-right:0.5rem;"></span>
              }
              {{ uploading() ? 'Uploading...' : 'Upload' }}
            </button>
          </div>
        </form>
      }

      <!-- Upload progress -->
      @if (uploading()) {
        <div class="upload-progress slide-in">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="uploadProgress()"></div>
          </div>
          <div class="progress-info">
            <span>Uploading... {{ uploadProgress() }}%</span>
          </div>
        </div>
      }

      <!-- Upload result -->
      @if (uploadResult()) {
        <div class="upload-result slide-in" role="status">
          @if (uploadResult()!.already_existed) {
            <div class="result-info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Document already exists (ID: {{ uploadResult()!.document_id }})</span>
            </div>
          } @else {
            <div class="result-success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>
                Uploaded: <strong>{{ uploadResult()!.title }}</strong> —
                {{ uploadResult()!.pages }} pages, {{ uploadResult()!.chunks }} chunks,
                {{ uploadResult()!.suspicious_chunks }} suspicious
              </span>
            </div>
          }
        </div>
      }

      <!-- Upload error -->
      @if (uploadError()) {
        <div class="error-card" role="alert">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>{{ uploadError() }}</p>
        </div>
      }

      <!-- Documents table -->
      <h3>Indexed Documents</h3>

      @if (documents().length === 0 && !uploading()) {
        <div class="empty-state">
          <svg class="empty-state-icon" width="64" height="64" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
               stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <h3>No documents yet</h3>
          <p>Upload your first PDF to get started. LabProof will chunk it and make it searchable.</p>
          <button type="button" class="btn-primary" (click)="fileInput.click()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Upload Document
          </button>
        </div>
      } @else {
        <!-- Search box -->
        <div class="table-controls">
          <div class="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search documents..."
              (input)="filterDocuments()"
              aria-label="Search documents"
            />
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Title</th>
                <th scope="col">Pages</th>
                <th scope="col">Chunks</th>
                <th scope="col">Source</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (doc of filteredDocuments(); track doc.id) {
                <tr>
                  <td>{{ doc.id }}</td>
                  <td>{{ doc.title }}</td>
                  <td>{{ doc.pages }}</td>
                  <td>{{ doc.chunks }}</td>
                  <td>
                    @if (doc.source_url) {
                      <a [href]="doc.source_url" target="_blank" rel="noopener noreferrer">{{ doc.source_url }}</a>
                    } @else {
                      <span class="muted">—</span>
                    }
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn-danger"
                      (click)="confirmDelete(doc)"
                      [disabled]="deletingId() === doc.id"
                      [attr.aria-label]="'Delete ' + doc.title"
                    >
                      @if (deletingId() === doc.id) {
                        <span class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
                      } @else {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      }
                      {{ deletingId() === doc.id ? '...' : 'Delete' }}
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="text-center muted">
                    @if (searchQuery()) {
                      No documents match "{{ searchQuery() }}"
                    } @else {
                      No documents found
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>

    <!-- Delete confirmation modal -->
    @if (deleteConfirmDoc()) {
      <div class="modal-overlay" (click)="cancelDelete()" role="dialog" aria-modal="true"
           aria-labelledby="modal-title">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 id="modal-title">Delete Document</h3>
            <button
              type="button"
              class="btn-icon"
              (click)="cancelDelete()"
              aria-label="Close dialog"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p>
              Are you sure you want to delete <strong>{{ deleteConfirmDoc()!.title }}</strong>?
            </p>
            <p class="modal-warning">
              This action cannot be undone. All {{ deleteConfirmDoc()!.chunks }} chunks will be permanently removed.
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="cancelDelete()">Cancel</button>
            <button type="button" class="btn-danger" (click)="executeDelete()">
              Delete Document
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .documents-section {
      max-width: 900px;
      margin: 0 auto;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding: 1rem;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.6);
      border-radius: var(--radius);
      min-height: 70px;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-primary);
    }

    .stat-success { color: var(--color-success); }
    .stat-warning { color: var(--color-warning); }
    .stat-error { color: var(--color-error); }

    .stat-label {
      font-size: 0.75rem;
      color: var(--color-text-dim);
      margin-top: 0.25rem;
    }

    h3 {
      margin: 2rem 0 1rem;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .upload-zone {
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-lg);
      padding: 3rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: all var(--duration-normal) var(--easing-standard);
      background: var(--color-bg-card);
    }

    .upload-zone:hover,
    .upload-zone.drag-over {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
    }

    .upload-zone.drag-over {
      transform: scale(1.01);
      box-shadow: var(--shadow-md);
    }

    .upload-zone:focus-visible {
      outline: var(--focus-ring);
      outline-offset: 2px;
    }

    .upload-icon {
      color: var(--color-primary);
      margin-bottom: 1rem;
    }

    .upload-text {
      margin: 0 0 0.25rem;
      font-size: 0.95rem;
      color: var(--color-text);
    }

    .upload-subtext {
      margin: 0;
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .file-preview {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      margin: 1rem 0;
    }

    .file-icon {
      color: var(--color-primary);
      flex-shrink: 0;
    }

    .file-info {
      flex: 1;
      min-width: 0;
    }

    .file-name {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-meta {
      margin: 0.25rem 0 0;
      font-size: 0.8rem;
      color: var(--color-text-dim);
    }

    .upload-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-row label {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .form-row input {
      width: 100%;
      padding: 0.7rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      font-size: 0.9rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .upload-progress {
      margin: 1rem 0;
    }

    .progress-bar {
      height: 8px;
      background: var(--color-bg-muted);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
      transition: width 0.3s var(--easing-standard);
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
      font-size: 0.8rem;
      color: var(--color-text-dim);
    }

    .upload-result {
      margin: 1rem 0;
      padding: 0.75rem 1rem;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .result-success {
      color: #166534;
      background: var(--color-success-light);
    }

    .result-info {
      color: var(--color-text-dim);
      background: var(--color-bg-muted);
    }

    .table-controls {
      margin: 1rem 0;
    }

    .search-box {
      position: relative;
      max-width: 300px;
    }

    .search-box svg {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-muted);
    }

    .search-box input {
      width: 100%;
      padding: 0.65rem 1rem 0.65rem 2.5rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      font-size: 0.9rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 3rem 1.5rem;
      gap: 1rem;
    }

    .text-center {
      text-align: center;
    }

    @media (max-width: 640px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .upload-zone {
        padding: 2rem 1rem;
      }
      .file-preview {
        flex-direction: column;
        text-align: center;
      }
      .table-wrapper {
        overflow-x: auto;
      }
      table {
        min-width: 600px;
      }
    }
  `]
})
export class DocumentsComponent implements OnInit {
  documents = signal<DocumentOut[]>([]);
  filteredDocuments = signal<DocumentOut[]>([]);
  stats = signal<StatsOut | null>(null);
  uploading = signal(false);
  uploadProgress = signal(0);
  deletingId = signal<number | null>(null);
  uploadResult = signal<IngestOut | null>(null);
  uploadError = signal<string | null>(null);
  selectedFile = signal<File | null>(null);
  isDragOver = signal(false);
  title = '';
  sourceUrl = '';
  license = '';
  searchQuery = signal('');
  deleteConfirmDoc = signal<DocumentOut | null>(null);

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.listDocuments().subscribe({
      next: docs => {
        this.documents.set(docs);
        this.filteredDocuments.set(docs);
      }
    });
    this.api.getStats().subscribe({
      next: stats => this.stats.set(stats)
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        this.selectFile(file);
      } else {
        this.toast.error('Please upload a PDF file');
      }
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectFile(input.files[0]);
    }
  }

  private selectFile(file: File): void {
    this.selectedFile.set(file);
    this.uploadError.set(null);
    this.uploadResult.set(null);
    const nameWithoutExt = file.name.replace(/\.pdf$/i, '');
    this.title = nameWithoutExt;
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.title = '';
    this.sourceUrl = '';
    this.license = '';
    this.uploadResult.set(null);
    this.uploadError.set(null);
  }

  onUpload(): void {
    if (!this.selectedFile() || !this.title.trim()) return;

    this.uploading.set(true);
    this.uploadError.set(null);
    this.uploadResult.set(null);
    this.uploadProgress.set(0);

    // Simulate progress (real progress would require XMLHttpRequest or fetch with progress)
    const progressInterval = setInterval(() => {
      this.uploadProgress.update(p => Math.min(p + 10, 90));
    }, 300);

    this.api.uploadDocument(
      this.selectedFile()!,
      this.title,
      this.sourceUrl || undefined,
      this.license || undefined
    ).subscribe({
      next: result => {
        clearInterval(progressInterval);
        this.uploadProgress.set(100);
        this.uploadResult.set(result);
        this.toast.success(`Document "${result.title}" uploaded successfully`);
        this.removeFile();
        this.load();
      },
      error: err => {
        clearInterval(progressInterval);
        this.uploadProgress.set(0);
        this.uploadError.set(err.error?.detail || 'Upload failed');
        this.toast.error('Upload failed: ' + (err.error?.detail || 'Unknown error'));
      },
      complete: () => this.uploading.set(false)
    });
  }

  filterDocuments(): void {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      this.filteredDocuments.set(this.documents());
      return;
    }
    this.filteredDocuments.set(
      this.documents().filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.source_url?.toLowerCase().includes(query)
      )
    );
  }

  confirmDelete(doc: DocumentOut): void {
    this.deleteConfirmDoc.set(doc);
  }

  cancelDelete(): void {
    this.deleteConfirmDoc.set(null);
  }

  executeDelete(): void {
    const doc = this.deleteConfirmDoc();
    if (!doc) return;

    this.deletingId.set(doc.id);
    this.api.deleteDocument(doc.id).subscribe({
      next: () => {
        this.documents.update(docs => docs.filter(d => d.id !== doc.id));
        this.filteredDocuments.update(docs => docs.filter(d => d.id !== doc.id));
        this.toast.success(`Document "${doc.title}" deleted`);
        this.deleteConfirmDoc.set(null);
        this.deletingId.set(null);
      },
      error: err => {
        this.toast.error('Delete failed: ' + (err.error?.detail || 'Unknown error'));
        this.deleteConfirmDoc.set(null);
        this.deletingId.set(null);
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
