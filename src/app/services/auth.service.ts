import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthResponse {
  access_token: string;
  user: User;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Signals for state management
  private currentUserSignal = signal<User | null>(this.getStoredUser());
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isLoggedIn = computed(() => !!this.currentUserSignal());

  constructor() {}

  signup(email: string, passwordPlain: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/signup`, {
        email,
        password: passwordPlain,
      })
      .pipe(
        tap((response) => this.handleAuthentication(response))
      );
  }

  login(email: string, passwordPlain: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, {
        email,
        password: passwordPlain,
      })
      .pipe(
        tap((response) => this.handleAuthentication(response))
      );
  }

  logout(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  private handleAuthentication(response: AuthResponse): void {
    if (response && response.access_token) {
      sessionStorage.setItem('token', response.access_token);
      sessionStorage.setItem('user', JSON.stringify(response.user));
      this.currentUserSignal.set(response.user);
    }
  }

  private getStoredUser(): User | null {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
}
