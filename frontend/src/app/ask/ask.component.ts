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
        <div class="form-group">
          <textarea
            [(ngModel)]="question"
            name="question"
            placeholder="e.g., How often must biological safety cabinets be certified?"
            rows="3"
            [disabled]="loading()"
            required
          ></textarea>
          @if (questionError) {
            <small class="form-error">{{ questionError }}</small>
          }
        </div>
        <div class="form-actions">
          <button type="submit" [disabled]="loading() || !questionTrimmed">
            {{ loading() ? 'Thinking...' : 'Ask' }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    .ask-section { max-width: 900px; margin: 0 auto; padding: 1.5rem; background: var(--bg-card); border-radius: var(--radius); box-shadow: var(--shadow); }
    .question-form { display: flex; flex-direction: column; gap: 0.75rem; }
    .form-group { display: flex; flex-direction: column; }
    .form-group .form-error {
      color: #ef4444; font-size: 0.8rem; margin-top: 0.25rem;
    }
    textarea {
      padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-sm);
      font-family: inherit; font-size: 1rem; resize: vertical;
      background: var(--bg); color: var(--text);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    textarea:focus {
      outline: none; border-color: var(--teal-400); box-shadow: 0 0 0 3px var(--teal-100);
    }
    textarea::placeholder { color: var(--text-dim); }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
    button[type="submit"] {
      padding: 0.6rem 1.25rem; background: var(--teal-600); color: white;
      border: none; border-radius: var(--radius-sm); cursor: pointer;
      font-size: 0.95rem; font-weight: 500; transition: background 0.15s;
    }
    button[type="submit"]:hover:not(:disabled) { background: var(--teal-500); }
    button[type="submit"]:disabled { background: var(--teal-200); color: var(--text-dim); cursor: not-allowed; }
    .form-error { margin-top: 0.25rem; font-size: 0.8rem; }
  `]
})
export class AskComponent {
  question = '';
  loading = signal(false);
  error = signal<string | null>(null);
  response = signal<AskResponse | null>(null);
  selectedCitation = signal<string | null>(null);

  constructor(private api: ApiService) {}

  get questionTrimmed(): boolean {
    return this.question.trim().length >= 3;
  }

  get questionError(): string | null {
    if (!this.questionTrimmed) return 'Question must be at least 3 characters';
    return null;
  }

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