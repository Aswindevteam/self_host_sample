import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  protected email = signal('');
  protected password = signal('');
  protected confirmPassword = signal('');
  protected error = signal('');
  protected loading = signal(false);

  onSubmit() {
    if (!this.email() || !this.password() || !this.confirmPassword()) {
      this.error.set('Please fill in all fields.');
      return;
    }
    if (this.password() !== this.confirmPassword()) {
      this.error.set('Passwords do not match.');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.authService.signup(this.email(), this.password()).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Registration failed. Please try again.');
      },
    });
  }
}
