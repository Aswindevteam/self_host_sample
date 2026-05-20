import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap, takeWhile } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { ProjectService, Project } from '../../services/project.service';
import { DeploymentService, Deployment } from '../../services/deployment.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.scss',
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private deploymentService = inject(DeploymentService);

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
    const logsText = this.selectedDeployment()?.logs || '';
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
