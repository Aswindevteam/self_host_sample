import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent implements OnInit {
  protected authService = inject(AuthService);
  private projectService = inject(ProjectService);
  protected hasProjects = signal(false);

  ngOnInit() {
    this.checkProjects();
  }

  checkProjects() {
    const user = this.authService.currentUser();
    if (user) {
      if (user.role === 'admin' || user.role === 'org-admin') {
        this.hasProjects.set(true);
        return;
      }
      this.projectService.getProjects().subscribe({
        next: (projs) => {
          this.hasProjects.set(projs && projs.length > 0);
        },
        error: () => {
          this.hasProjects.set(false);
        }
      });
    }
  }
}
