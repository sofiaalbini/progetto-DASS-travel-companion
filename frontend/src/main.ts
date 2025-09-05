// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import 'zone.js';

type UserPrefs = {
  username: string;
  prefs: string[];
  createdAt: string;
};

const STORAGE_KEY = 'tourmate_users';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
  <main class="container">
    <h1>Tourmate — Preferenze di viaggio</h1>
    <p class="subtitle">
      Inserisci il tuo <strong>username</strong> (deve essere univoco) e seleziona le preferenze di viaggio.
    </p>

    <form (ngSubmit)="save()" class="card" novalidate>
      <div class="field">
        <label for="username">Username</label>
        <input id="username" name="username"
               [(ngModel)]="username"
               (input)="checkUnique()"
               [class.invalid]="usernameTouched && !isUsernameValid"
               placeholder="es. giulia_87" />
        <div class="hint" *ngIf="usernameTouched && !isUsernameValid">{{ usernameError }}</div>
      </div>

      <div class="field">
        <label>Preferenze</label>
        <div class="chips">
          <label *ngFor="let p of allPrefs" class="chip">
          <input type="checkbox"
       [checked]="selected.has(p)"
       (change)="toggle(p, $event.target)" />
            <span>{{ p }}</span>
          </label>
        </div>
        <div class="hint small" *ngIf="selected.size === 0">Seleziona almeno una preferenza.</div>
      </div>

      <div class="actions">
        <button type="submit" [disabled]="!canSave()">Salva profilo</button>
        <button type="button" class="ghost" (click)="reset()">Pulisci</button>
      </div>
    </form>

    <section class="list" *ngIf="users().length">
      <h2>Utenti salvati</h2>
      <ul>
        <li *ngFor="let u of users()">
          <div class="user-row">
            <div class="user-head">
             <strong>&#64;{{ u.username }}</strong>
              <span class="when">{{ u.createdAt }}</span> 
            </div>
            <div class="prefs">
              <span class="pill" *ngFor="let p of u.prefs">{{ p }}</span>
            </div>
          </div>
          <div class="row-actions">
            <button class="ghost" (click)="load(u.username)">Carica</button>
            <button class="danger" (click)="remove(u.username)">Elimina</button>
          </div>
        </li>
      </ul>
      <div class="footer-actions">
        <button class="danger" (click)="removeAll()">Elimina tutto</button>
      </div>
    </section>

    <section *ngIf="!users().length" class="empty">
      <p>Nessun profilo salvato ancora.</p>
    </section>
  </main>
  `,
  styles: [`
    :host { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
    .container { max-width: 820px; margin: 32px auto; padding: 0 16px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    .subtitle { color: #555; margin: 0 0 16px; }
    .card { background: #fff; border: 1px solid #e6e6e6; border-radius: 12px; padding: 16px; }
    .field { margin-bottom: 16px; }
    label { display:block; font-weight: 600; margin-bottom: 8px; }
    input { width: 100%; padding: 10px 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 14px; }
    input.invalid { border-color: #e11d48; background: #fff1f2; }
    .hint { color:#b91c1c; margin-top:6px; }
    .hint.small { color:#6b7280; }
    .chips { display:flex; flex-wrap:wrap; gap:8px; }
    .chip { display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border:1px solid #d1d5db; border-radius:999px; cursor:pointer; user-select:none; }
    .chip input { appearance:none; width:16px; height:16px; border:1px solid #9ca3af; border-radius:4px; }
    .chip input:checked { background:#1f6feb; border-color:#1f6feb; }
    .actions { display:flex; gap:8px; margin-top:12px; }
    button { border:0; border-radius:8px; padding:10px 14px; cursor:pointer; background:#1f6feb; color:#fff; }
    button:disabled { opacity:.6; cursor:not-allowed; }
    .ghost { background:#f3f4f6; color:#222; }
    .danger { background:#e11d48; color:#fff; }
    .list { margin-top:24px; }
    ul { list-style:none; padding:0; margin:0; display:grid; gap:12px; }
    li { border:1px solid #eee; border-radius:10px; padding:12px; display:grid; grid-template-columns:1fr auto; gap:12px; }
    .user-row { display:flex; flex-direction:column; gap:6px; }
    .user-head { display:flex; gap:8px; align-items:center; }
    .when { color:#6b7280; font-size:12px; }
    .prefs { display:flex; flex-wrap:wrap; gap:6px; }
    .pill { background:#eef2ff; color:#1e3a8a; border-radius:999px; padding:4px 10px; font-size:12px; }
    .row-actions { display:flex; gap:8px; }
    .empty { color:#6b7280; margin-top:24px; }
  `]
})
export class AppComponent {
  username = '';
  usernameTouched = false;
  usernameError = '';
  selected = new Set<string>();

  allPrefs = [
    'Mare','Montagna','Città d\'arte','Avventura','Relax',
    'Cultura','Cibo','Natura','Nightlife','Shopping',
    'Musei','Sport','Road trip','Camping','Crociera',
    'Safari','Spa','Trekking','Storia','Fotografia'
  ];

  private _users = signal<UserPrefs[]>(this.loadAll());
  users = computed(() => this._users());

  toggle(pref: string, el: EventTarget | null) {
  const input = el as HTMLInputElement;
  if (input?.checked) this.selected.add(pref);
  else this.selected.delete(pref);
}
  load(username: string) {
    const found = this._users().find(u => u.username === username);
    if (!found) return;
    this.username = found.username;
    this.selected = new Set(found.prefs);
    this.usernameTouched = true;
    this.usernameError = '';
  }

  remove(username: string) {
    const next = this._users().filter(u => u.username !== username);
    this._users.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  removeAll() {
    localStorage.removeItem(STORAGE_KEY);
    this._users.set([]);
  }

  reset() {
    this.username = '';
    this.usernameTouched = false;
    this.usernameError = '';
    this.selected.clear();
  }

  canSave(): boolean {
    return this.isUsernameValid && this.selected.size > 0;
  }

  get isUsernameValid(): boolean {
    const u = this.username.trim();
    if (!u) return false;
    const ok = /^[a-zA-Z0-9_.]{3,20}$/.test(u);
    if (!ok) { this.usernameError = 'Usa 3–20 caratteri (lettere, numeri, _ .)'; return false; }
    const exists = this._users().some(x => x.username.toLowerCase() === u.toLowerCase());
    if (exists && !this.isEditingExisting(u)) { this.usernameError = 'Username già esistente.'; return false; }
    this.usernameError = ''; return true;
  }

  checkUnique() { this.usernameTouched = true; void this.isUsernameValid; }

  private isEditingExisting(u: string): boolean {
    // Permettiamo di risalvare lo stesso username (aggiorna il profilo)
    return this._users().some(x => x.username.toLowerCase() === u.toLowerCase());
  }

  save() {
    this.usernameTouched = true;
    if (!this.canSave()) return;

    const entry: UserPrefs = {
      username: this.username.trim(),
      prefs: Array.from(this.selected),
      createdAt: new Date().toLocaleString(),
    };

    const others = this._users().filter(u => u.username.toLowerCase() !== entry.username.toLowerCase());
    const next = [entry, ...others];
    this._users.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    this.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private loadAll(): UserPrefs[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    try { return raw ? JSON.parse(raw) as UserPrefs[] : []; } catch { return []; }
  }
}

bootstrapApplication(AppComponent).catch(err => console.error(err));

