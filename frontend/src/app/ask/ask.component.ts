import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, AskResponse, Citation, DocumentOut } from '../api.service';
import { ToastService } from '../toast.service';

interface ExampleQuestion {
  text: string;
  label: string;
}

const EXAMPLE_QUESTIONS: ExampleQuestion[] = [
  { text: 'How often must biological safety cabinets be certified?', label: 'BSC certification' },
  { text: 'What PPE is required for BSL-2 work?', label: 'BSL-2 PPE' },
  { text: 'How should sharps be disposed of in a laboratory?', label: 'Sharps disposal' },
];

@Component({
  selector: 'app-ask',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="ask-section glass-card">
      @if (!hasAsked()) {
        <!-- Welcome state -->
        <div class="welcome-state">
          <div class="welcome-icon" aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </div>
          <h2>Ask a question</h2>
          <p>Get evidence-checked answers about laboratory safety procedures. Every sentence is verified against official sources.</p>

          <div class="example-section">
            <h3>Try asking:</h3>
            <div class="example-chips">
              @for (ex of examples; track ex.text) {
                <button type="button" class="example-chip" (click)="askExample(ex.text)">
                  {{ ex.label }}
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Question form (always visible) -->
      <form (ngSubmit)="onSubmit()" class="question-form" aria-label="Ask a question">
        <label for="question-input" class="visually-hidden">Your question</label>
        <div class="form-group">
          <textarea
            id="question-input"
            [(ngModel)]="question"
            name="question"
            placeholder="e.g., How often must biological safety cabinets be certified?"
            rows="3"
            [disabled]="loading()"
            required
            aria-required="true"
            aria-describedby="question-hint"
          ></textarea>
          <small id="question-hint" class="form-hint">Minimum 3 characters</small>
          @if (questionError) {
            <small class="form-error" role="alert">{{ questionError }}</small>
          }
        </div>

        <!-- Source selector -->
        <div class="source-selector" *ngIf="documents().length > 0">
          <label class="source-label">Search in:</label>
          <div class="source-options">
            <label class="source-option" *ngFor="let doc of documents(); let i = index">
              <input type="checkbox" [value]="doc.id" (change)="onSourceChange(doc.id)" />
              <span>{{ doc.title }}</span>
            </label>
          </div>
          <button type="button" class="btn-link" (click)="selectAllSources()">Select all</button>
          <button type="button" class="btn-link" (click)="deselectAllSources()">Deselect all</button>
        </div>

        <div class="form-actions">
          <label class="force-answer-label" *ngIf="!loading()">
            <input type="checkbox" [(ngModel)]="forceAnswer" name="force_answer" />
            <span>Force answer (bypass abstention)</span>
          </label>
          <button type="submit" class="btn-ask" [disabled]="loading() || !questionTrimmed">
            @if (loading()) {
              <span class="spinner-small"></span>
              <span>Thinking...</span>
            } @else {
              <svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Ask</span>
            }
          </button>
        </div>
      </form>

      <!-- Loading skeleton -->
      @if (loading() && !response()) {
        <div class="answer-skeleton" aria-label="Loading answer">
          <div class="skeleton skeleton-line w-80"></div>
          <div class="skeleton skeleton-line w-60"></div>
          <div class="skeleton skeleton-line w-90"></div>
        </div>
      }

      <!-- Error card -->
      @if (error()) {
        <div class="error-card" role="alert">
          <div class="error-card-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3>Couldn't get an answer</h3>
          <p>{{ error() }}</p>
          <div class="error-card-actions">
            <button type="button" class="btn-primary" (click)="retry()">Try Again</button>
            <button type="button" class="btn-text" (click)="clearError()">Clear</button>
          </div>
        </div>
      }

      <!-- Answer -->
      @if (response() && !loading()) {
        <div class="answer-section slide-in">
          <div class="answer-header">
            <h3>Answer</h3>
            <button type="button" class="btn-icon" (click)="copyAnswer()" aria-label="Copy answer to clipboard" title="Copy answer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>

          <div class="answer-content">
            @if (response()?.verdict === 'abstained') {
              <p class="answer-text abstain-text">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-icon" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                </svg>
                {{ response()?.abstain_reason || 'The documents do not contain enough information to answer this question.' }}
              </p>
            } @else {
              <div class="answer-sentences">
                @for (sentence of response()?.answer; track $index) {
                  <p class="answer-text sentence" [class]="'status-' + sentence.status">
                    {{ sentence.text }}
                    <span class="sentence-status" aria-hidden="true">{{ statusLabel(sentence.status) }}</span>
                    @if (sentence.citations && sentence.citations.length) {
                      <span class="sentence-chips">
                        @for (c of sentence.citations; track c) {
                          <button type="button" class="chip" (click)="focusCitation(c)" [attr.aria-label]="'Show source ' + c">{{ c }}</button>
                        }
                      </span>
                    }
                  </p>
                }
              </div>
            }

            @if (response()?.verdict) {
              <div class="verdict-badge" [class]="'verdict-' + response()?.verdict">
                @if (response()?.verdict === 'verified') {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                } @else if (response()?.verdict === 'partially_verified') {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                } @else if (response()?.verdict === 'unverified') {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                } @else if (response()?.verdict === 'abstained') {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /></svg>
                }
                {{ formatVerdict(response()?.verdict || '') }}
              </div>
            }

            @if (response()?.groundedness) {
              <div class="groundedness-bar">
                <span class="groundedness-label">Groundedness:</span>
                <div class="groundedness-track">
                  <div class="groundedness-fill" [style.width.%]="(response()?.groundedness || 0) * 100"></div>
                </div>
                <span class="groundedness-value">{{ Math.round((response()?.groundedness || 0) * 100) }}%</span>
              </div>
            }
          </div>

          <!-- Citations -->
          @if (response()?.citations?.length) {
            <div class="citations-section">
              <h4>Sources</h4>
              <div class="citations-grid">
                @for (cit of response()!.citations; track cit.source_id) {
                  <div class="citation-card glass-card"
                       [class.selected]="selectedCitation() === cit.source_id"
                       (mouseenter)="showPreview(cit.source_id)"
                       (mouseleave)="hidePreview()"
                       (click)="selectCitation(cit.source_id)"
                       tabindex="0"
                       role="button"
                       [attr.aria-pressed]="selectedCitation() === cit.source_id"
                       [attr.aria-label]="'View citation: ' + cit.title + ', page ' + cit.page_start"
                       (keydown.enter)="selectCitation(cit.source_id)"
                       (keydown.space)="selectCitation(cit.source_id)">
                    <div class="citation-header">
                      <span class="citation-id">S{{ cit.source_id }}</span>
                      <span class="citation-page">p. {{ cit.page_start }}{{ cit.page_end !== cit.page_start ? '–' + cit.page_end : '' }}</span>
                    </div>
                    <p class="citation-title">{{ cit.title }}</p>
                    @if (cit.section) {
                      <p class="citation-section">{{ cit.section }}</p>
                    }
                    @if (previewId() === cit.source_id) {
                      <div class="citation-preview">
                        <p class="preview-text">{{ cit.snippet | slice:0:180 }}{{ cit.snippet.length > 180 ? '...' : '' }}</p>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .ask-section { max-width: 800px; margin: 0 auto; padding: 0; }

    /* ── Welcome State ─────────────────────────────────────── */
    .welcome-state { text-align: center; padding: 3rem 1.5rem 2rem; }
    .welcome-icon {
      width: 72px; height: 72px; margin: 0 auto 1.25rem;
      color: var(--color-primary);
      background: linear-gradient(135deg, var(--color-primary-light), rgba(37, 99, 235, 0.08));
      border-radius: var(--radius-xl); display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .welcome-state h2 { margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 700; color: var(--color-text); }
    .welcome-state p { margin: 0 0 2rem; color: var(--color-text-dim); font-size: 1rem; line-height: 1.6; max-width: 480px; margin-left: auto; margin-right: auto; }

    .example-section h3 { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); margin: 0 0 0.75rem; }
    .example-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
    .example-chip {
      padding: 0.6rem 1rem; background: var(--color-bg-card); border: 1px solid var(--color-border);
      border-radius: var(--radius-full); font-size: 0.85rem; color: var(--color-text-dim);
      cursor: pointer; transition: all var(--duration-fast) var(--easing-standard);
      min-height: 44px; box-shadow: var(--shadow-sm);
    }
    .example-chip:hover { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary); box-shadow: var(--shadow-md); transform: translateY(-1px); }
    .example-chip:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }

    /* ── Question Form ─────────────────────────────────────── */
    .question-form { margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--color-border); }
    .form-group { margin-bottom: 1rem; }
    textarea {
      width: 100%; padding: 0.85rem 1rem; border: 1px solid var(--color-border);
      border-radius: var(--radius); font-family: inherit; font-size: 0.95rem; resize: vertical;
      background: var(--color-bg-card); color: var(--color-text);
      transition: border-color var(--duration-fast) var(--easing-standard), box-shadow var(--duration-fast) var(--easing-standard); min-height: 80px;
    }
    textarea:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--focus-shadow); }
    textarea::placeholder { color: var(--color-text-muted); }
    textarea:disabled { background: var(--color-bg-muted); color: var(--color-text-muted); }
    .form-hint { display: block; margin-top: 0.35rem; font-size: 0.8rem; color: var(--color-text-muted); }
    .form-error { display: block; color: var(--color-error); font-size: 0.8rem; margin-top: 0.35rem; }

    /* ── Source Selector ───────────────────────────────────── */
    .source-selector {
      margin: 1rem 0; padding: 1rem; background: var(--color-bg-muted);
      border-radius: var(--radius); display: flex; flex-direction: column; gap: 0.5rem;
    }
    .source-label { font-size: 0.85rem; font-weight: 600; color: var(--color-text-dim); }
    .source-options { display: flex; flex-direction: column; gap: 0.4rem; }
    .source-option {
      display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--color-text);
      cursor: pointer; padding: 0.4rem 0.5rem; border-radius: var(--radius-sm); transition: background var(--duration-fast) var(--easing-standard);
    }
    .source-option:hover { background: var(--color-bg-card); }
    .source-option input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--color-primary); }
    .source-actions { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
    .btn-link { background: none; border: none; color: var(--color-primary); font-size: 0.8rem; cursor: pointer; text-decoration: underline; padding: 0; }

    /* ── Modern Ask Button ─────────────────────────────────── */
    .form-actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; }
    .force-answer-label {
      display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--color-text-dim); cursor: pointer;
    }
    .force-answer-label input { width: 16px; height: 16px; accent-color: var(--color-warning); }

    .btn-ask {
      display: inline-flex; align-items: center; gap: 0.6rem;
      padding: 0.85rem 2rem;
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
      color: white; border: none; border-radius: var(--radius-full);
      font-size: 1rem; font-weight: 600; font-family: inherit;
      cursor: pointer; transition: all var(--duration-normal) var(--easing-standard);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      min-height: 48px;
    }
    .btn-ask:hover:not(:disabled) {
      transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
      background: linear-gradient(135deg, var(--color-primary-hover) 0%, var(--color-primary) 100%);
    }
    .btn-ask:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
    .btn-ask:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }
    .btn-icon { width: 20px; height: 20px; flex-shrink: 0; }
    .spinner-small {
      width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Loading Skeleton ──────────────────────────────────── */
    .answer-skeleton { margin-top: 2rem; }
    .answer-section { margin-top: 2rem; }
    .answer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .answer-header h3 { margin: 0; font-size: 1.1rem; font-weight: 600; }
    .answer-content { padding: 1.25rem; background: var(--color-bg-muted); border-radius: var(--radius); margin-bottom: 1.5rem; }
    .answer-text { line-height: 1.6; color: var(--color-text); display: flex; align-items: flex-start; gap: 0.5rem; margin: 0 0 0.5rem; }
    .inline-icon { flex-shrink: 0; margin-top: 0.2rem; color: var(--color-text-dim); }
    .abstain-text { color: var(--color-text-dim); font-style: italic; margin: 0; }

    /* ── Sentence Status Colors ────────────────────────────── */
    .status-supported { background: rgba(34, 197, 94, 0.08); border-left: 3px solid var(--color-success); padding: 0.4rem 0.6rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; margin: 0 0 0.5rem; }
    .status-unsupported { background: rgba(239, 68, 68, 0.08); border-left: 3px solid var(--color-error); padding: 0.4rem 0.6rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; margin: 0 0 0.5rem; }
    .status-uncited, .status-unverified { background: rgba(245, 158, 11, 0.08); border-left: 3px solid var(--color-warning); padding: 0.4rem 0.6rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; margin: 0 0 0.5rem; }
    .sentence-status { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-left: auto; flex-shrink: 0; opacity: 0.75; }
    .sentence-chips { display: inline-flex; gap: 0.25rem; flex-wrap: wrap; margin-left: auto; }
    .chip { font-size: 0.7rem; font-weight: 600; color: var(--color-primary); background: rgba(37, 99, 235, 0.1); border: none; border-radius: var(--radius-full); padding: 0.1rem 0.45rem; cursor: pointer; transition: background var(--duration-fast) var(--easing-standard); }
    .chip:hover { background: rgba(37, 99, 235, 0.25); }

    /* ── Verdict Badge ─────────────────────────────────────── */
    .verdict-badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem; border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .verdict-verified { background: var(--color-success-light); color: #166534; }
    .verdict-partially_verified { background: var(--color-warning-light); color: #92400e; }
    .verdict-unverified { background: var(--color-error-light); color: #991b1b; }
    .verdict-abstained { background: var(--color-bg-muted); color: var(--color-text-dim); }

    /* ── Groundedness Bar ──────────────────────────────────── */
    .groundedness-bar { display: flex; align-items: center; gap: 0.75rem; margin-top: 1rem; font-size: 0.85rem; }
    .groundedness-label { color: var(--color-text-dim); white-space: nowrap; }
    .groundedness-track { flex: 1; height: 6px; background: var(--color-border); border-radius: var(--radius-full); overflow: hidden; }
    .groundedness-fill { height: 100%; background: linear-gradient(90deg, var(--color-success), #16a34a); border-radius: var(--radius-full); transition: width 0.5s var(--easing-standard); }
    .groundedness-value { font-weight: 600; color: var(--color-text); min-width: 3rem; text-align: right; }

    /* ── Citations ─────────────────────────────────────────── */
    .citations-section h4 { margin: 0 0 1rem; font-size: 0.9rem; font-weight: 600; color: var(--color-text-dim); }
    .citations-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; }
    .citation-card { padding: 0.85rem; cursor: pointer; transition: all var(--duration-fast) var(--easing-standard); position: relative; }
    .citation-card:hover, .citation-card.selected { border-color: var(--color-primary); background: var(--color-primary-light); }
    .citation-card:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }
    .citation-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .citation-id { font-size: 0.75rem; font-weight: 700; color: var(--color-primary); background: rgba(37, 99, 235, 0.1); padding: 0.15rem 0.5rem; border-radius: var(--radius-full); }
    .citation-page { font-size: 0.75rem; color: var(--color-text-muted); }
    .citation-title { margin: 0; font-size: 0.85rem; font-weight: 500; color: var(--color-text); line-height: 1.4; }
    .citation-section { margin: 0.35rem 0 0; font-size: 0.75rem; color: var(--color-text-muted); font-style: italic; }
    .citation-preview { position: absolute; bottom: 100%; left: 0; right: 0; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 0.75rem; box-shadow: var(--shadow-lg); z-index: 10; margin-bottom: 0.5rem; }
    .preview-text { margin: 0; font-size: 0.8rem; line-height: 1.5; color: var(--color-text-dim); }

    /* ── Error Card ────────────────────────────────────────── */
    .error-card { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 2rem; background: var(--color-error-light); border: 1px solid var(--color-error); border-radius: var(--radius-md); text-align: center; animation: slideIn 0.3s var(--easing-standard); }
    .error-card-icon { width: 40px; height: 40px; color: var(--color-error); }
    .error-card h3 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--color-error); }
    .error-card p { margin: 0; font-size: 0.9rem; color: var(--color-text-dim); }
    .error-card-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }

    .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

    @media (max-width: 640px) {
      .ask-section { padding: 1.25rem; }
      .citations-grid { grid-template-columns: 1fr; }
      .form-actions { flex-direction: column; align-items: stretch; }
      .btn-ask { width: 100%; justify-content: center; }
    }
  `]
})
export class AskComponent implements OnInit {
  readonly Math = Math;
  question = '';
  hasAsked = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  response = signal<AskResponse | null>(null);
  selectedCitation = signal<string | null>(null);
  previewId = signal<string | null>(null);
  copied = signal(false);
  forceAnswer = signal(false);
  documents = signal<DocumentOut[]>([]);
  selectedSourceIds = signal<number[]>([]);
  readonly examples = EXAMPLE_QUESTIONS;

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.api.listDocuments().subscribe({
      next: docs => this.documents.set(docs)
    });
  }

  onSourceChange(id: number): void {
    const current = this.selectedSourceIds();
    const newIds = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    this.selectedSourceIds.set(newIds);
  }

  selectAllSources(): void {
    this.selectedSourceIds.set(this.documents().map(d => d.id));
  }

  deselectAllSources(): void {
    this.selectedSourceIds.set([]);
  }

  get questionTrimmed(): boolean {
    return this.question.trim().length >= 3;
  }

  get questionError(): string | null {
    if (!this.questionTrimmed) return 'Question must be at least 3 characters';
    return null;
  }

  askExample(text: string): void {
    this.question = text;
    this.onSubmit();
  }

  async onSubmit() {
    if (!this.questionTrimmed) return;
    this.hasAsked.set(true);
    this.error.set(null);
    this.response.set(null);
    this.loading.set(true);

    try {
      const res = await this.api.ask(this.question.trim(), {
        document_ids: this.selectedSourceIds().length > 0 ? this.selectedSourceIds() : undefined,
        force_answer: this.forceAnswer()
      }).toPromise();
      this.response.set(res!);
    } catch (e: any) {
      this.error.set(e.error?.detail || 'Request failed');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    this.onSubmit();
  }

  clearError(): void {
    this.error.set(null);
  }

  selectCitation(id: string): void {
    this.selectedCitation.set(this.selectedCitation() === id ? null : id);
  }

  focusCitation(id: string): void {
    this.selectedCitation.set(id);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'supported': return '✓ verified';
      case 'unsupported': return '✗ unverified';
      case 'uncited': return '? uncited';
      default: return '? unverified';
    }
  }

  showPreview(id: string): void {
    this.previewId.set(id);
  }

  hidePreview(): void {
    this.previewId.set(null);
  }

  async copyAnswer(): Promise<void> {
    const sentences = this.response()?.answer || [];
    const answerText = sentences.map(s => s.text).join(' ');
    try {
      await navigator.clipboard.writeText(answerText);
      this.toast.success('Answer copied to clipboard');
    } catch {
      this.toast.error('Failed to copy answer');
    }
  }

  formatVerdict(verdict: string): string {
    return verdict.replace(/_/g, ' ');
  }
}
