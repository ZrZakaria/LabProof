import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <!-- Sidebar (desktop: fixed left, mobile: slide-out overlay) -->
      <aside class="sidebar" [class.open]="sidebarOpen()">
        <div class="brand">
          <div class="brand-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 3h6" />
              <path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9.5V3" />
              <path d="M7.5 14h9" />
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">LabProof</span>
            <span class="brand-sub">Evidence-checked answers</span>
          </div>
        </div>

        <nav class="nav" aria-label="Main navigation">
          <a routerLink="/ask" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round"
                 stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Ask</span>
          </a>
          <a routerLink="/documents" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round"
                 stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Documents</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Zero-cost · Local · Offline
          </div>
        </div>
      </aside>

      <!-- Main content area -->
      <div class="layout-wrapper">
        <!-- Mobile header -->
        <header class="mobile-header">
          <button
            type="button"
            class="icon-btn hamburger"
            (click)="toggleSidebar()"
            [attr.aria-expanded]="sidebarOpen()"
            aria-label="Toggle navigation menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span class="mobile-title">LabProof</span>
          <div class="mobile-spacer"></div>
        </header>

        <!-- Sidebar overlay (mobile only) -->
        <div
          class="sidebar-overlay"
          [class.visible]="sidebarOpen()"
          (click)="toggleSidebar(false)"
          [attr.tabindex]="sidebarOpen() ? 0 : -1"
          aria-label="Close navigation menu"
        ></div>

        <main class="main">
          <router-outlet></router-outlet>
        </main>

        <!-- Toast notifications -->
        <div class="toast-container" aria-live="polite" aria-atomic="true">
          @for (t of toastService.toasts(); track t.id) {
            <div class="toast" [class]="'toast-' + t.type">
              {{ t.message }}
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Layout Shell ─────────────────────────────────────── */
    .app-shell {
      display: flex;
      min-height: 100vh;
      background: var(--color-bg);
    }

    /* ── Sidebar ──────────────────────────────────────────── */
    .sidebar {
      width: 240px;
      min-width: 240px;
      background: #0f172a;
      color: #e2e8f0;
      display: flex;
      flex-direction: column;
      padding: 1.25rem 0;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 100;
      transition: transform 0.3s var(--easing-standard);
      overflow-y: auto;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0 1.25rem;
      margin-bottom: 2rem;
    }

    .brand-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(37, 99, 235, 0.15));
      border: 1px solid rgba(37, 99, 235, 0.3);
      border-radius: var(--radius);
      flex-shrink: 0;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .brand-name {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;
    }

    .brand-sub {
      font-size: 0.7rem;
      color: #94a3b8;
      line-height: 1.2;
    }

    .nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0 0.75rem;
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 0.875rem;
      border-radius: var(--radius);
      min-height: 44px;
      color: #cbd5e1;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.95rem;
      transition: background var(--duration-fast) var(--easing-standard),
                  color var(--duration-fast) var(--easing-standard),
                  transform var(--duration-fast) var(--easing-standard);
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }

    .nav-item.active {
      background: var(--color-primary);
      color: #fff;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    }

    .nav-item:focus-visible {
      outline: 2px solid #60a5fa;
      outline-offset: 2px;
    }

    .nav-icon {
      flex-shrink: 0;
      opacity: 0.85;
    }

    .nav-item.active .nav-icon {
      opacity: 1;
    }

    .sidebar-footer {
      padding: 1rem 1.25rem;
      margin-top: auto;
    }

    .badge {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 0.4rem 0.65rem;
      border-radius: 999px;
    }

    /* ── Layout Wrapper ───────────────────────────────────── */
    .layout-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin-left: 240px;
      min-height: 100vh;
      background: var(--color-bg);
    }

    /* ── Mobile Header ────────────────────────────────────── */
    .mobile-header {
      display: none;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 1rem;
      background: var(--color-bg-card);
      border-bottom: 1px solid var(--color-border);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .mobile-title {
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--color-text);
    }

    .hamburger {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.4rem;
      border-radius: var(--radius-sm);
      color: var(--color-text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      transition: background var(--duration-fast) var(--easing-standard);
    }

    .hamburger:hover {
      background: var(--color-bg-muted);
    }

    .mobile-spacer {
      width: 44px;
    }

    /* ── Main Content ─────────────────────────────────────── */
    .main {
      flex: 1;
      padding: 2rem 2.5rem;
      overflow-y: auto;
    }

    /* ── Sidebar Overlay ──────────────────────────────────── */
    .sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 90;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .sidebar-overlay.visible {
      display: block;
      opacity: 1;
    }

    /* ── Responsive ───────────────────────────────────────── */
    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
      }

      .sidebar.open {
        transform: translateX(0);
      }

      .layout-wrapper {
        margin-left: 0;
      }

      .mobile-header {
        display: flex;
      }

      .main {
        padding: 1rem;
      }
    }

    /* ── Toast ────────────────────────────────────────────── */
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      padding: 0.8rem 1.25rem;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      font-size: 0.9rem;
      animation: slideIn 0.3s var(--easing-bounce);
    }

    .toast-success { border-left: 4px solid var(--color-success); }
    .toast-error { border-left: 4px solid var(--color-error); }
    .toast-info { border-left: 4px solid var(--color-primary); }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  readonly toasts = signal<Toast[]>([]);
  sidebarOpen = signal(false);
  private resizeListener = () => {
    if (window.innerWidth > 768) this.sidebarOpen.set(false);
  };

  constructor(public toastService: ToastService) {
    this.toasts = this.toastService.toasts;
  }

  ngOnInit(): void {
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
  }

  toggleSidebar(open?: boolean): void {
    this.sidebarOpen.set(open ?? !this.sidebarOpen());
  }
}
