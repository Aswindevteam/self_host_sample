// Force reload compile trigger
import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProjectService, Project } from '../../services/project.service';
import { DockerService, DockerContainer } from '../../services/docker.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  protected authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private dockerService = inject(DockerService);

  protected activeTab = signal<'apps' | 'docker'>('apps');

  // Apps State
  protected projects = signal<Project[]>([]);
  protected loadingApps = signal(false);

  // Docker State
  protected containers = signal<DockerContainer[]>([]);
  protected loadingDocker = signal(false);

  // Selected Container Logs Modal State
  protected selectedContainerName = signal('');
  protected selectedContainerLogs = signal<string | null>(null);
  protected loadingLogs = signal(false);

  // New Project Form Signals
  protected showCreateForm = signal(false);
  protected deploySource = signal<'git' | 'image'>('git');
  protected newProjectName = signal('');
  protected newProjectDesc = signal('');
  protected newProjectGitUrl = signal('');
  protected newProjectBranch = signal('main');
  protected newProjectImage = signal('');
  protected newProjectPort = signal(3000);
  protected newProjectDomain = signal('');
  protected createLoading = signal(false);
  protected createError = signal('');

  ngOnInit() {
    this.loadProjects();
    this.loadContainers();
  }

  setTab(tab: 'apps' | 'docker') {
    this.activeTab.set(tab);
    if (tab === 'apps') {
      this.loadProjects();
    } else {
      this.loadContainers();
    }
  }

  setDeploySource(source: 'git' | 'image') {
    this.deploySource.set(source);
    this.createError.set('');
  }

  loadProjects() {
    this.loadingApps.set(true);
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        this.loadingApps.set(false);
      },
      error: () => {
        this.loadingApps.set(false);
      },
    });
  }

  loadContainers() {
    this.loadingDocker.set(true);
    this.dockerService.getContainers().subscribe({
      next: (data) => {
        this.containers.set(data);
        this.loadingDocker.set(false);
      },
      error: () => {
        this.loadingDocker.set(false);
      },
    });
  }

  // Docker Operations
  startContainer(id: string) {
    this.dockerService.startContainer(id).subscribe(() => this.loadContainers());
  }

  stopContainer(id: string) {
    this.dockerService.stopContainer(id).subscribe(() => this.loadContainers());
  }

  restartContainer(id: string) {
    this.dockerService.restartContainer(id).subscribe(() => this.loadContainers());
  }

  viewContainerLogs(c: DockerContainer) {
    this.selectedContainerName.set(c.names[0] || c.id.substring(0, 12));
    this.selectedContainerLogs.set('');
    this.loadingLogs.set(true);
    this.dockerService.getContainerLogs(c.id, 100).subscribe({
      next: (res) => {
        this.selectedContainerLogs.set(res.logs || 'No logs found.');
        this.loadingLogs.set(false);
      },
      error: (err) => {
        this.selectedContainerLogs.set(`Error loading logs: ${err.message}`);
        this.loadingLogs.set(false);
      },
    });
  }

  closeLogsModal() {
    this.selectedContainerLogs.set(null);
  }

  toggleCreateForm() {
    this.showCreateForm.set(!this.showCreateForm());
    this.createError.set('');
  }

  onCreateProject() {
    if (!this.newProjectName()) {
      this.createError.set('Project name is required.');
      return;
    }

    if (this.deploySource() === 'git' && !this.newProjectGitUrl()) {
      this.createError.set('Git Repository URL is required.');
      return;
    }

    if (this.deploySource() === 'image' && !this.newProjectImage()) {
      this.createError.set('Docker Image name (e.g. nginx:alpine) is required.');
      return;
    }

    this.createLoading.set(true);
    this.createError.set('');

    const newProject: Partial<Project> = {
      name: this.newProjectName(),
      description: this.newProjectDesc(),
      port: this.newProjectPort(),
      domain: this.newProjectDomain() ? this.newProjectDomain().trim() : undefined,
      envVariables: {},
    };

    if (this.deploySource() === 'git') {
      newProject.gitUrl = this.newProjectGitUrl();
      newProject.branch = this.newProjectBranch();
    } else {
      newProject.dockerImage = this.newProjectImage();
    }

    this.projectService.createProject(newProject).subscribe({
      next: (created) => {
        this.projects.update((current) => [...current, created]);
        this.createLoading.set(false);
        this.showCreateForm.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.createLoading.set(false);
        this.createError.set(err.error?.message || 'Failed to create project.');
      },
    });
  }

  private resetForm() {
    this.newProjectName.set('');
    this.newProjectDesc.set('');
    this.newProjectGitUrl.set('');
    this.newProjectBranch.set('main');
    this.newProjectImage.set('');
    this.newProjectPort.set(3000);
    this.newProjectDomain.set('');
    this.deploySource.set('git');
  }
}
