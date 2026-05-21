import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';

type DeployMethod = 'git' | 'dist';
type Step = 'source' | 'config' | 'review';

@Component({
  selector: 'app-deploy',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './deploy.html',
  styleUrl: './deploy.scss',
})
export class DeployComponent implements OnInit {
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user && user.role !== 'admin' && user.role !== 'org-admin') {
      this.projectService.getProjects().subscribe({
        next: (projs) => {
          if (!projs || projs.length === 0) {
            this.router.navigate(['/dashboard']);
          }
        },
        error: () => {
          this.router.navigate(['/dashboard']);
        }
      });
    }
  }

  protected step = signal<Step>('source');
  protected deployMethod = signal<DeployMethod>('git');

  // Source fields
  protected projectName = signal('');
  protected description = signal('');
  protected gitUrl = signal('');
  protected branch = signal('main');
  protected distPath = signal('dist');

  // Config fields
  protected port = signal(3000);
  protected envVars = signal<{ key: string; value: string }[]>([]);
  protected enableDomain = signal(false);
  protected domain = signal('');
  protected enableNginx = signal(true);
  protected nginxType = signal<'reverse_proxy' | 'static'>('reverse_proxy');
  protected nginxCustomConfig = signal('');

  // State
  protected loading = signal(false);
  protected error = signal('');

  setMethod(m: DeployMethod) {
    this.deployMethod.set(m);
    this.error.set('');
  }

  goToConfig() {
    if (!this.projectName().trim()) {
      this.error.set('Project name is required.');
      return;
    }
    if (this.deployMethod() === 'git' && !this.gitUrl().trim()) {
      this.error.set('Git repository URL is required.');
      return;
    }
    if (this.deployMethod() === 'dist' && !this.distPath().trim()) {
      this.error.set('Dist folder path is required.');
      return;
    }
    this.error.set('');
    this.step.set('config');
  }

  goToReview() {
    if (this.enableDomain() && !this.domain().trim()) {
      this.error.set('Please enter a domain name or disable custom domain.');
      return;
    }
    this.error.set('');
    this.step.set('review');
  }

  back() {
    if (this.step() === 'config') this.step.set('source');
    if (this.step() === 'review') this.step.set('config');
    this.error.set('');
  }

  addEnvVar() {
    this.envVars.update(v => [...v, { key: '', value: '' }]);
  }

  removeEnvVar(i: number) {
    this.envVars.update(v => v.filter((_, idx) => idx !== i));
  }

  updateEnvKey(i: number, key: string) {
    this.envVars.update(v => v.map((e, idx) => idx === i ? { ...e, key } : e));
  }

  updateEnvValue(i: number, value: string) {
    this.envVars.update(v => v.map((e, idx) => idx === i ? { ...e, value } : e));
  }

  getEnvVarsMap(): Record<string, string> {
    const map: Record<string, string> = {};
    this.envVars().forEach(e => {
      if (e.key.trim()) map[e.key.trim()] = e.value;
    });
    return map;
  }

  onDeploy() {
    this.loading.set(true);
    this.error.set('');

    const payload: any = {
      name: this.projectName(),
      description: this.description(),
      port: this.port(),
      envVariables: this.getEnvVarsMap(),
    };

    if (this.deployMethod() === 'git') {
      payload.gitUrl = this.gitUrl();
      payload.branch = this.branch();
    } else {
      payload.distPath = this.distPath();
      payload.dockerImage = undefined;
    }

    if (this.enableDomain() && this.domain().trim()) {
      payload.domain = this.domain().trim();
    }

    if (this.enableNginx()) {
      payload.nginxConfig = {
        type: this.nginxType(),
        customConfig: this.nginxCustomConfig() || undefined,
      };
    }

    this.projectService.createProject(payload).subscribe({
      next: (project) => {
        this.loading.set(false);
        this.router.navigate(['/project', project._id]);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to create project. Please try again.');
      },
    });
  }
}
