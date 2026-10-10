import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <h1>LabProof</h1>
      <nav>
        <a routerLink="ask" routerLinkActive="active">Ask</a>
        <a routerLink="documents" routerLinkActive="active">Documents</a>
      </nav>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; border-bottom: 1px solid #e0e0e0; }
    h1 { margin: 0; font-size: 1.5rem; }
    nav a { margin-left: 1.5rem; text-decoration: none; color: #333; font-weight: 500; }
    nav a.active { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 0.25rem; }
    main { padding: 2rem; max-width: 900px; margin: 0 auto; }
  `]
})
export class AppComponent {}