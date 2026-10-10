import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-icon">🧫</div>
          <div class="brand-text">
            <span class="brand-name">LabProof</span>
            <span class="brand-sub">Evidence-checked lab answers</span>
          </div>
        </div>
        <nav class="nav">
          <a routerLink="/ask" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">💬</span> Ask
          </a>
          <a routerLink="/documents" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📚</span> Documents
          </a>
        </nav>
        <div class="sidebar-footer">
          <span class="badge">Zero-cost · Local · Offline</span>
        </div>
      </aside>

      <main class="main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-shell { display: flex; min-height: 100vh; }
    .sidebar {
      width: 260px; min-width: 260px;
      background: var(--teal-950);
      color: #e2e8f0;
      display: flex; flex-direction: column;
      padding: 1.5rem 0;
    }
    .brand { display: flex; align-items: center; gap: 0.75rem; padding: 0 1.5rem; margin-bottom: 2rem; }
    .brand-icon { font-size: 2rem; }
    .brand-name { display: block; font-size: 1.25rem; font-weight: 700; color: #fff; }
    .brand-sub { display: block; font-size: 0.75rem; color: #94a3b8; }
    .nav { display: flex; flex-direction: column; gap: 0.25rem; padding: 0 1rem; }
    .nav-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem; border-radius: var(--radius-sm);
      color: #cbd5e1; text-decoration: none; font-weight: 500;
      transition: background 0.15s, color 0.15s;
    }
    .nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .nav-item.active { background: var(--teal-500); color: #fff; }
    .nav-icon { font-size: 1.1rem; }
    .sidebar-footer { margin-top: auto; padding: 0 1.5rem; }
    .badge {
      font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;
      color: #64748b; background: rgba(255,255,255,0.04);
      padding: 0.35rem 0.6rem; border-radius: 999px;
    }
    .main { flex: 1; padding: 2rem 2.5rem; overflow-y: auto; }
  `]
})
export class AppComponent {}