import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, DocumentOut, IngestOut, StatsOut } from '../api.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="documents-section">
      <h2>Documents</h2>

      <div class="stats" *ngIf="stats()">
        <div class="stat"><strong>{{ stats()!.queries }}</strong> queries</div>
        <div class="stat"><strong>{{ stats()!.verified }}</strong> verified</div>
        <div class="stat"><strong>{{ stats()!.partially_verified }}</strong> partially</div>
        <div class="stat"><strong>{{ stats()!.unverified }}</strong> unverified</div>
        <div class="stat"><strong>{{ stats()!.abstained }}</strong> abstained</div>
        <div class="stat"><strong>{{ stats()!.avg_groundedness }}</strong> groundedness</div>
        <div class="stat"><strong>{{ stats()!.p50_ms }}ms</strong> p50</div>
        <div class="stat"><strong>{{ stats()!.p95_ms }}ms</strong> p95</div>
      </div>

      <h3>Upload PDF</h3>
      <form (ngSubmit)="onUpload()" class="upload-form" [class.uploading]="uploading()">
        <input type="file" #fileInput accept=".pdf" (change)="onFileSelect($event)" hidden>
        <button type="button" class="btn-secondary" (click)="fileInput.click()" [disabled]="uploading()">
          Choose PDF
        </button>
        <span class="filename" *ngIf="selectedFile()">{{ selectedFile()!.name }}</span>
        <input type="text" [(ngModel)]="title" name="title" placeholder="Title" required [disabled]="uploading()">
        <input type="text" [(ngModel)]="sourceUrl" name="source_url" placeholder="Source URL (optional)" [disabled]="uploading()">
        <input type="text" [(ngModel)]="license" name="license" placeholder="License (optional)" [disabled]="uploading()">
        <button type="submit" class="btn-primary" [disabled]="uploading() || !selectedFile() || !title.trim()">
          {{ uploading() ? 'Uploading...' : 'Upload' }}
        </button>
      </form>

      <div class="upload-result" *ngIf="uploadResult()">
        @if (uploadResult()!.already_existed) {
          <div class="success">Document already existed (id: {{ uploadResult()!.document_id }})</div>
        } @else {
          <div class="success">Uploaded: {{ uploadResult()!.title }} ({{ uploadResult()!.pages }} pages, {{ uploadResult()!.chunks }} chunks, {{ uploadResult()!.suspicious_chunks }} suspicious)</div>
        }
      </div>

      <div class="error" *ngIf="uploadError()">{{ uploadError() }}</div>

      <h3>Indexed Documents</h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Pages</th>
              <th>Chunks</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (doc of documents(); track doc.id) {
              <tr>
                <td>{{ doc.id }}</td>
                <td>{{ doc.title }}</td>
                <td>{{ doc.pages }}</td>
                <td>{{ doc.chunks }}</td>
                <td>
                  @if (doc.source_url) {
                    <a [href]="doc.source_url" target="_blank">{{ doc.source_url }}</a>
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
                <td>
                  <button class="btn-danger" (click)="deleteDocument(doc.id)" [disabled]="deletingId() === doc.id">
                    {{ deletingId() === doc.id ? 'Deleting...' : 'Delete' }}
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (documents().length === 0) {
          <p class="muted">No documents indexed yet.</p>
        }
      </div>
    </section>
  `,
  styles: [`
    .documents-section { max-width: 900px; margin: 0 auto; }
    .stats { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 8px; font-size: 0.9rem; }
    .stat { display: flex; flex-direction: column; }
    .stat strong { font-size: 1.2rem; color: #1976d2; }
    h3 { margin-top: 2rem; }
    .upload-form { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-bottom: 1rem; }
    .btn-secondary { padding: 0.5rem 1rem; background: #e0e0e0; border: none; border-radius: 4px; cursor: pointer; }
    .btn-secondary:hover { background: #d5d5d5; }
    .filename { font-size: 0.9rem; color: #666; }
    .upload-form input[type="text"] { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; min-width: 200px; }
    .btn-primary { padding: 0.5rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .btn-primary:disabled { background: #90caf9; cursor: not-allowed; }
    .upload-result { margin-bottom: 1rem; }
    .success { color: #2e7d32; background: #e8f5e9; padding: 0.75rem; border-radius: 4px; }
    .error { color: #c62828; background: #ffebee; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
    .table-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
    th { background: #f5f5f5; font-weight: 600; }
    .muted { color: #999; font-style: italic; }
    .btn-danger { padding: 0.3rem 0.75rem; background: #ef5350; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
    .btn-danger:disabled { background: #ef9a9a; cursor: not-allowed; }
    a { color: #1976d2; text-decoration: none; }
    a:hover { text-decoration: underline; }
  `]
})
export class DocumentsComponent implements OnInit {
  documents = signal<DocumentOut[]>([]);
  stats = signal<StatsOut | null>(null);
  uploading = signal(false);
  deletingId = signal<number | null>(null);
  uploadResult = signal<IngestOut | null>(null);
  uploadError = signal<string | null>(null);
  selectedFile = signal<File | null>(null);
  title = '';
  sourceUrl = '';
  license = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.listDocuments().subscribe({ next: d => this.documents.set(d) });
    this.api.getStats().subscribe({ next: s => this.stats.set(s) });
  }

  onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile.set(input.files[0]);
      this.uploadError.set(null);
    }
  }

  onUpload() {
    if (!this.selectedFile() || !this.title.trim()) return;
    this.uploading.set(true);
    this.uploadError.set(null);
    this.uploadResult.set(null);

    this.api.uploadDocument(this.selectedFile()!, this.title, this.sourceUrl || undefined, this.license || undefined)
      .subscribe({
        next: r => {
          this.uploadResult.set(r);
          this.title = '';
          this.sourceUrl = '';
          this.license = '';
          this.selectedFile.set(null);
          this.load();
        },
        error: e => {
          this.uploadError.set(e.error?.detail || 'Upload failed');
        },
        complete: () => this.uploading.set(false)
      });
  }

  deleteDocument(id: number) {
    if (!confirm('Delete this document?')) return;
    this.deletingId.set(id);
    this.api.deleteDocument(id).subscribe({
      next: () => {
        this.documents.update(d => d.filter(x => x.id !== id));
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null)
    });
  }
}