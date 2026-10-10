import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, AskResponse, AnswerSentence, Citation } from '../api.service';

@Component({
  selector: 'app-ask',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="ask-section">
      <h2>Ask a question</h2>
      <form (ngSubmit)="onSubmit()" class="question-form">
        <textarea
          [(ngModel)]="question"
          name="question"
          placeholder="e.g., How often must biological safety cabinets be certified?"
          rows="2"
          [disabled]="loading()"
          required
        ></textarea>
        <div class="form-actions">
          <button type="submit" [disabled]="loading() || !question.trim()">
            {{ loading() ? 'Thinking...' : 'Ask' }}
          </button>
        </div>
      </form>

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }

      @if (response()) {
        <div class="response">
          <div class="verdict-badge" [class]="'verdict-' + response()!.verdict">
            {{ response()!.verdict }}
          </div>

          @if (response()!.abstain_reason) {
            <p class="abstain-reason">{{ response()!.abstain_reason }}</p>
          }

          @if (response()!.answer.length > 0) {
            <div class="answer">
              @for (sentence of response()!.answer; track $index) {
                <span class="sentence" [class]="sentence.status"
                      [title]="sentence.status + (sentence.entailment !== null ? ' · P(entail)=' + sentence.entailment.toFixed(2) : '')">
                  {{ sentence.text }}
                  @for (cit of sentence.citations; track cit) {
                    <button type="button" class="cite" (click)="selectCitation(cit)">{{ cit }}</button>
                  }
                </span>
              }
            </div>
          }

          <div class="citations-panel" *ngIf="response()!.citations.length > 0">
            <h4>Sources</h4>
            @for (cit of response()!.citations; track cit.source_id) {
              <div class="citation-card" [class.selected]="selectedCitation() === cit.source_id"
                   (click)="selectCitation(cit.source_id)">
                <strong>{{ cit.source_id }}</strong> — {{ cit.title }}
                <span class="pages">pp. {{ cit.page_start }}{{ cit.page_end !== cit.page_start ? '-' + cit.page_end : '' }}</span>
                @if (cit.section) { <span class="section">{{ cit.section }}</span> }
                @if (cit.rerank_score !== null) { <span class="rerank">rerank: {{ (cit.rerank_score * 100).toFixed(1) }}%</span> }
                <div class="snippet">{{ cit.snippet }}</div>
              </div>
            }
          </div>

          <details class="timings">
            <summary>Timings (ms)</summary>
            <pre>{{ response()!.timings_ms | json }}</pre>
          </details>
        </div>
      }
    </section>
  `,
  styles: [`
    .ask-section { max-width: 900px; margin: 0 auto; }
    .question-form { margin-bottom: 1.5rem; }
    textarea { width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; font-size: 1rem; resize: vertical; }
    textarea:focus { outline: none; border-color: #1976d2; }
    .form-actions { margin-top: 0.5rem; }
    button[type="submit"] { padding: 0.6rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
    button[type="submit"]:disabled { background: #90caf9; cursor: not-allowed; }
    .error { color: #c62828; background: #ffebee; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
    .response { margin-top: 1.5rem; }
    .verdict-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; }
    .verdict-verified { background: #c8e6c9; color: #1b5e20; }
    .verdict-partially_verified { background: #fff9c4; color: #f57f17; }
    .verdict-unverified { background: #ffcdd2; color: #b71c1c; }
    .verdict-abstained { background: #e0e0e0; color: #424242; }
    .abstain-reason { color: #666; font-style: italic; }
    .answer { line-height: 1.8; font-size: 1.05rem; margin: 1rem 0; }
    .sentence { display: inline; }
    .sentence.supported { background: #e8f5e9; padding: 0 0.15rem; border-radius: 2px; }
    .sentence.unsupported { background: #fff8e1; padding: 0 0.15rem; border-radius: 2px; border-bottom: 2px solid #fbc02d; }
    .sentence.uncited { background: #fce4ec; padding: 0 0.15rem; border-radius: 2px; border-bottom: 2px solid #e91e63; }
    .sentence.unverified { opacity: 0.7; }
    .cite { background: #1976d2; color: white; border: none; border-radius: 2px; padding: 0 0.4rem; margin-left: 0.2rem; font-size: 0.75rem; cursor: pointer; vertical-align: super; }
    .cite:hover { background: #1565c0; }
    .citations-panel { border-top: 1px solid #e0e0e0; padding-top: 1rem; margin-top: 1.5rem; }
    .citations-panel h4 { margin-top: 0; }
    .citation-card { border: 1px solid #e0e0e0; border-radius: 4px; padding: 0.75rem; margin-bottom: 0.5rem; background: #fafafa; cursor: pointer; transition: background 0.2s; }
    .citation-card:hover, .citation-card.selected { background: #e3f2fd; border-color: #1976d2; }
    .citation-card strong { display: block; margin-bottom: 0.25rem; }
    .pages, .section, .rerank { font-size: 0.85rem; color: #666; margin-right: 0.75rem; }
    .snippet { margin-top: 0.5rem; font-size: 0.9rem; color: #444; white-space: pre-wrap; }
    .timings { margin-top: 1.5rem; font-size: 0.85rem; color: #666; }
    .timings summary { cursor: pointer; color: #1976d2; }
    .timings pre { background: #f5f5f5; padding: 0.5rem; border-radius: 4px; overflow-x: auto; font-size: 0.8rem; }
  `]
})
export class AskComponent {
  question = '';
  loading = signal(false);
  error = signal<string | null>(null);
  response = signal<AskResponse | null>(null);
  selectedCitation = signal<string | null>(null);

  constructor(private api: ApiService) {}

  async onSubmit() {
    this.error.set(null);
    this.response.set(null);
    this.loading.set(true);

    try {
      const res = await this.api.ask(this.question).toPromise();
      this.response.set(res!);
    } catch (e: any) {
      this.error.set(e.error?.detail || 'Request failed');
    } finally {
      this.loading.set(false);
    }
  }

  selectCitation(id: string) {
    this.selectedCitation.set(this.selectedCitation() === id ? null : id);
  }
}