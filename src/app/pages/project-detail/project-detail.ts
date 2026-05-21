import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap, takeWhile } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService, Project } from '../../services/project.service';
import { DeploymentService, Deployment } from '../../services/deployment.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.scss',
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private deploymentService = inject(DeploymentService);
  protected authService = inject(AuthService);

  protected get isAdmin() {
    return this.authService.currentUser()?.role === 'admin';
  }

  protected get isOrgAdmin() {
    return this.authService.currentUser()?.role === 'org-admin';
  }

  protected get canEdit() {
    const user = this.authService.currentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'org-admin') return true;
    return user.permissions?.canEdit !== false;
  }

  protected get canDelete() {
    const user = this.authService.currentUser();
    if (!user) return false;
    return user.role === 'admin' || user.role === 'org-admin';
  }

  // Editing state
  protected editingConfig = signal(false);
  protected editType = signal<'git' | 'docker' | 'dist'>('git');
  protected editGitUrl = signal('');
  protected editBranch = signal('');
  protected editDockerImage = signal('');
  protected editDistPath = signal('');
  protected editPort = signal(3000);
  protected editDomain = signal('');
  protected savingConfig = signal(false);
  protected configError = signal('');

  startEditConfig() {
    const proj = this.project();
    if (proj) {
      if (proj.dockerImage) {
        this.editType.set('docker');
      } else if (proj.distPath) {
        this.editType.set('dist');
      } else {
        this.editType.set('git');
      }
      this.editGitUrl.set(proj.gitUrl || '');
      this.editBranch.set(proj.branch || 'main');
      this.editDockerImage.set(proj.dockerImage || '');
      this.editDistPath.set(proj.distPath || '');
      this.editPort.set(proj.port || 3000);
      this.editDomain.set(proj.domain || '');
      this.configError.set('');
      this.editingConfig.set(true);
    }
  }

  cancelEditConfig() {
    this.editingConfig.set(false);
    this.configError.set('');
  }

  saveConfig() {
    this.savingConfig.set(true);
    this.configError.set('');

    const updatedData: Partial<Project> = {
      port: this.editPort(),
      domain: this.editDomain() || undefined,
    };

    const type = this.editType();

    if (type === 'docker') {
      updatedData.dockerImage = this.editDockerImage();
    } else if (type === 'dist') {
      updatedData.distPath = this.editDistPath();
    } else {
      updatedData.gitUrl = this.editGitUrl();
      updatedData.branch = this.editBranch() || 'main';
    }

    this.projectService.updateProject(this.projectId(), updatedData).subscribe({
      next: (updatedProj) => {
        this.project.set(updatedProj);
        this.savingConfig.set(false);
        this.editingConfig.set(false);
      },
      error: (err) => {
        this.savingConfig.set(false);
        this.configError.set(err.error?.message || 'Failed to update configuration.');
      }
    });
  }

  protected projectId = signal<string>('');
  protected project = signal<Project | null>(null);
  protected deployments = signal<Deployment[]>([]);
  protected selectedDeployment = signal<Deployment | null>(null);

  protected projectLoading = signal(false);
  protected deploymentsLoading = signal(false);
  protected triggerLoading = signal(false);
  protected copyText = signal('Copy Logs');

  private pollSubscription?: Subscription;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.projectId.set(id);
      this.loadProjectDetails();
      this.loadDeployments(true); // Initial load
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  loadProjectDetails() {
    this.projectLoading.set(true);
    this.projectService.getProject(this.projectId()).subscribe({
      next: (data) => {
        this.project.set(data);
        this.projectLoading.set(false);
      },
      error: () => {
        this.projectLoading.set(false);
      },
    });
  }

  loadDeployments(selectLatest = false) {
    this.deploymentsLoading.set(true);
    this.deploymentService.getDeployments(this.projectId()).subscribe({
      next: (data) => {
        this.deployments.set(data);
        if (data.length > 0) {
          if (selectLatest) {
            this.selectedDeployment.set(data[0]);
          } else {
            // Update the selected deployment if it is still in the list to get fresh logs
            const currentSelected = this.selectedDeployment();
            if (currentSelected) {
              const updated = data.find((d) => d._id === currentSelected._id);
              if (updated) {
                this.selectedDeployment.set(updated);
              }
            }
          }
          // Start polling if the selected/latest deployment is building or pending
          this.checkAndStartPolling();
        }
        this.deploymentsLoading.set(false);
      },
      error: () => {
        this.deploymentsLoading.set(false);
      },
    });
  }

  onTriggerDeployment() {
    this.triggerLoading.set(true);
    this.deploymentService.triggerDeployment(this.projectId()).subscribe({
      next: (newDep) => {
        this.deployments.update((current) => [newDep, ...current]);
        this.selectedDeployment.set(newDep);
        this.triggerLoading.set(false);
        this.startPolling(newDep._id);
      },
      error: () => {
        this.triggerLoading.set(false);
      },
    });
  }

  onRollback(deploymentId: string) {
    this.triggerLoading.set(true);
    this.deploymentService.rollbackDeployment(deploymentId).subscribe({
      next: (newDep) => {
        this.deployments.update((current) => [newDep, ...current]);
        this.selectedDeployment.set(newDep);
        this.triggerLoading.set(false);
        this.startPolling(newDep._id);
      },
      error: () => {
        this.triggerLoading.set(false);
      },
    });
  }

  onDeleteProject() {
    if (confirm('Are you sure you want to delete this project? This will also remove the container and all deployments.')) {
      this.projectService.deleteProject(this.projectId()).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          alert('Failed to delete project: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  copyLogs() {
    const logsArray = this.selectedDeployment()?.logs || [];
    const logsText = Array.isArray(logsArray) ? logsArray.join('\n') : '';
    if (logsText) {
      navigator.clipboard.writeText(logsText).then(() => {
        this.copyText.set('Copied!');
        setTimeout(() => this.copyText.set('Copy Logs'), 2000);
      });
    }
  }

  selectDeployment(dep: Deployment) {
    this.selectedDeployment.set(dep);
    this.stopPolling();
    this.checkAndStartPolling();
  }

  private checkAndStartPolling() {
    const selected = this.selectedDeployment();
    if (selected && (selected.status === 'PENDING' || selected.status === 'BUILDING')) {
      this.startPolling(selected._id);
    }
  }

  private startPolling(deploymentId: string) {
    this.stopPolling();
    
    // Poll the specific deployment every 2 seconds until status changes
    this.pollSubscription = interval(2000)
      .pipe(
        switchMap(() => this.deploymentService.getDeployment(deploymentId)),
        takeWhile((dep) => dep.status === 'PENDING' || dep.status === 'BUILDING', true)
      )
      .subscribe({
        next: (freshDep) => {
          this.selectedDeployment.set(freshDep);
          
          // Update status in the general deployments list as well
          this.deployments.update((list) =>
            list.map((d) => (d._id === freshDep._id ? freshDep : d))
          );

          if (freshDep.status !== 'PENDING' && freshDep.status !== 'BUILDING') {
            this.stopPolling();
          }
        },
        error: () => this.stopPolling(),
      });
  }

  private stopPolling() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = undefined;
    }
  }
}
