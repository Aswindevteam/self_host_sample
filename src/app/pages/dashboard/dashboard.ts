import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ProjectService, Project } from '../../services/project.service';
import { DockerService, DockerContainer } from '../../services/docker.service';
import { environment } from '../../../environments/environment';

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
  private http = inject(HttpClient);

  protected get isAdmin() {
    return this.authService.currentUser()?.role === 'admin';
  }

  protected get isOrgAdmin() {
    return this.authService.currentUser()?.role === 'org-admin';
  }

  protected activeTab = signal<'apps' | 'docker'>('apps');

  // Apps State
  protected projects = signal<Project[]>([]);
  protected loadingApps = signal(false);
  protected projectsByOrg = signal<{ orgId: string; orgName: string; projects: Project[] }[]>([]);
  protected orgNames = signal<Map<string, string>>(new Map());

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
  protected newProjectGitUrl = signal('');
  protected newProjectBranch = signal('main');
  protected newProjectImage = signal('');
  protected newProjectPort = signal(3000);
  protected newProjectDomain = signal('');
  protected createLoading = signal(false);
  protected createError = signal('');

  // Organization onboarding signals
  protected orgName = signal('');
  protected orgDesc = signal('');
  protected orgLoading = signal(false);
  protected orgError = signal('');

  ngOnInit() {
    if (this.authService.currentUser()?.organizationId) {
      this.loadProjects();
      this.loadContainers();
    }
  }

  onCreateOrganization() {
    if (!this.orgName().trim()) {
      this.orgError.set('Organization name is required.');
      return;
    }
    this.orgLoading.set(true);
    this.orgError.set('');
    this.authService.createOrganization(this.orgName().trim(), this.orgDesc().trim()).subscribe({
      next: () => {
        this.orgLoading.set(false);
        this.loadProjects();
        this.loadContainers();
      },
      error: (err) => {
        this.orgLoading.set(false);
        this.orgError.set(err.error?.message || 'Failed to create organization.');
      },
    });
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
        console.log('[Dashboard] Projects received:', data);
        this.projects.set(data);

        // Group projects by organization for admins
        if (this.isAdmin) {
          const grouped = new Map<string, { projects: Project[]; orgName: string }>();
          data.forEach((project) => {
            const orgId = (project.owner as any)?.organizationId || 'no-org';
            const orgName = (project as any).organizationName;
            console.log(`[Dashboard] Project ${project.name}: orgId=${orgId}, orgName=${orgName}`);
            if (!grouped.has(orgId)) {
              grouped.set(orgId, { projects: [], orgName: orgName || orgId });
            }
            grouped.get(orgId)!.projects.push(project);
          });

          // Convert Map to array
          const groupedArray = Array.from(grouped.entries()).map(([orgId, group]) => ({
            orgId,
            orgName: group.orgName === 'no-org' ? 'No Organization' : group.orgName,
            projects: group.projects,
          }));
          console.log('[Dashboard] Grouped projects:', groupedArray);
          this.projectsByOrg.set(groupedArray);
        } else {
          this.projectsByOrg.set([]);
        }

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
    this.selectedContainerName.set(c.projectName || c.names[0] || c.id.substring(0, 12));
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
      port: this.newProjectPort(),
      domain: this.newProjectDomain() ? this.newProjectDomain().trim() : undefined,
      env: {},
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
    this.newProjectGitUrl.set('');
    this.newProjectBranch.set('main');
    this.newProjectImage.set('');
    this.newProjectPort.set(3000);
    this.newProjectDomain.set('');
    this.deploySource.set('git');
  }
}
