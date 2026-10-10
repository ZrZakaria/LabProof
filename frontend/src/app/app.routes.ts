import { Routes } from '@angular/router';
import { AskComponent } from './ask/ask.component';
import { DocumentsComponent } from './documents/documents.component';

export const routes: Routes = [
  { path: '', redirectTo: 'ask', pathMatch: 'full' },
  { path: 'ask', component: AskComponent },
  { path: 'documents', component: DocumentsComponent }
];