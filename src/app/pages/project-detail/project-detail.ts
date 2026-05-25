import { Component, signal, inject, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
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

  protected get canDeploy() {
    const user = this.authService.currentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'org-admin') return true;
    return user.permissions?.canDeploy !== false;
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
  protected editCustomNginxConfig = signal('');
  protected savingConfig = signal(false);
  protected configError = signal('');
  
  // Nginx config history state
  protected nginxHistory = signal<any[]>([]);
  protected showingNginxHistory = signal(false);
  protected showNginxDrawer = signal(false);

  // Nginx Helper Form
  protected nginxFormHttps = signal(true);
  protected nginxFormGzip = signal(true);
  protected nginxFormSecurity = signal(true);
  protected nginxFormMaxBody = signal('50M');

  // Dist upload state (for edit config)
  @ViewChild('configFolderInput') configFolderInputRef!: ElementRef<HTMLInputElement>;
  protected cfgDistFiles = signal<{ file: File; path: string }[]>([]);
  protected cfgDistFolderName = signal('');
  protected cfgDistFileCount = signal(0);
  protected cfgDistUploading = signal(false);
  protected cfgDistUploaded = signal(false);
  protected cfgIsDragOver = signal(false);
  protected cfgUseManualDistPath = signal(true); // Default to manual path on edit since it already has a path

  protected showDistUploadModal = signal(false);

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
      this.editCustomNginxConfig.set(proj.customNginxConfig || '');
      this.configError.set('');
      // Reset dist upload state
      this.cfgDistFiles.set([]);
      this.cfgDistFolderName.set('');
      this.cfgDistFileCount.set(0);
      this.cfgDistUploaded.set(false);
      this.cfgDistUploading.set(false);
      this.editingConfig.set(true);
    }
  }

  cancelEditConfig() {
    this.editingConfig.set(false);
    this.configError.set('');
    this.cfgDistFiles.set([]);
    this.cfgDistFolderName.set('');
    this.cfgDistFileCount.set(0);
    this.cfgDistUploaded.set(false);
    this.cfgDistUploading.set(false);
  }

  cfgToggleDistInputMethod() {
    this.cfgUseManualDistPath.update(v => !v);
    this.configError.set('');
    if (this.cfgUseManualDistPath()) {
      this.cfgResetDistUpload();
    } else {
      // Clear path when switching to upload mode, or keep it so they can cancel? 
      // Actually, when switching to upload mode, we shouldn't necessarily clear it, 
      // but let's keep it consistent. We can let `editDistPath` remain as the current path 
      // until they upload a new one.
    }
  }

  // ─── Dist upload for edit config ─────────────────────────────────────────

  cfgOnDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.cfgIsDragOver.set(true);
  }

  cfgOnDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.cfgIsDragOver.set(false);
  }

  async cfgOnDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.cfgIsDragOver.set(false);
    this.configError.set('');

    const items = event.dataTransfer?.items;
    if (!items || items.length === 0) return;

    const allFileData: { file: File; path: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) {
        const files = await this.getFilesFromEntry(entry, '');
        allFileData.push(...files);
      }
    }
    if (!allFileData.length) return;

    const folderName = allFileData[0].path.split('/')[0] || 'folder';
    this.cfgDistFolderName.set(folderName);
    this.cfgDistFileCount.set(allFileData.length);
    this.cfgDistFiles.set(allFileData);
    this.cfgDistUploaded.set(false);
    this.cfgUploadDistFolder();
  }

  cfgOnFolderInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const fileList = input.files;
    if (!fileList || !fileList.length) return;

    const fileDataList: { file: File; path: string }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      fileDataList.push({ file, path: (file as any).webkitRelativePath || file.name });
    }
    const folderName = fileDataList[0]?.path.split('/')[0] || 'folder';
    this.cfgDistFolderName.set(folderName);
    this.cfgDistFileCount.set(fileDataList.length);
    this.cfgDistFiles.set(fileDataList);
    this.cfgDistUploaded.set(false);
    input.value = '';
    this.cfgUploadDistFolder();
  }

  cfgClickFolderInput() {
    this.configFolderInputRef?.nativeElement?.click();
  }

  cfgResetDistUpload() {
    this.cfgDistFiles.set([]);
    this.cfgDistFolderName.set('');
    this.cfgDistFileCount.set(0);
    this.cfgDistUploaded.set(false);
    this.cfgDistUploading.set(false);
    this.editDistPath.set(this.project()?.distPath || '');
  }

  cfgUploadDistFolder() {
    const files = this.cfgDistFiles();
    if (!files.length) return;

    this.cfgDistUploading.set(true);
    this.configError.set('');

    const formData = new FormData();
    for (const { file, path } of files) {
      formData.append('files', file, path);
    }

    this.projectService.uploadDist(formData).subscribe({
      next: (res) => {
        this.editDistPath.set(res.distPath);
        this.cfgDistUploading.set(false);
        this.cfgDistUploaded.set(true);
      },
      error: (err) => {
        this.cfgDistUploading.set(false);
        this.configError.set('Upload failed: ' + (err.error?.message || err.message || 'Unknown error'));
      },
    });
  }

  // ─── Directory traversal helpers ─────────────────────────────────────────

  private async getFilesFromEntry(
    entry: FileSystemEntry,
    basePath: string
  ): Promise<{ file: File; path: string }[]> {
    if (entry.isFile) {
      return new Promise((resolve) => {
        (entry as FileSystemFileEntry).file((file) => {
          resolve([{ file, path: basePath + entry.name }]);
        });
      });
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const entries = await this.readAllEntries(reader);
      const nested = await Promise.all(
        entries.map((e) => this.getFilesFromEntry(e, basePath + entry.name + '/'))
      );
      return nested.flat();
    }
    return [];
  }

  private readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    const all: FileSystemEntry[] = [];
    return new Promise((resolve) => {
      const read = () => {
        reader.readEntries((batch) => {
          if (batch.length === 0) resolve(all);
          else { all.push(...batch); read(); }
        });
      };
      read();
    });
  }

  saveConfig() {
    this.savingConfig.set(true);
    this.configError.set('');

    const updatedData: Partial<Project> = {
      port: this.editPort(),
      domain: this.editDomain() || undefined,
      customNginxConfig: this.editCustomNginxConfig() || undefined,
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
        if (updatedData.customNginxConfig !== undefined) {
           this.loadNginxHistory();
        }
      },
      error: (err) => {
        this.savingConfig.set(false);
        this.configError.set(err.error?.message || 'Failed to update configuration.');
      }
    });
  }

  openNginxDrawer() {
    this.showNginxDrawer.set(true);
    if (!this.editCustomNginxConfig()) {
      this.generateNginxTemplate();
    }
  }

  generateNginxTemplate() {
    const domain = this.editDomain() || 'localhost';
    const port = this.editPort() || 3000;
    
    let config = `server {\n`;
    config += `  listen 80;\n`;
    config += `  server_name ${domain};\n\n`;
    
    if (this.nginxFormMaxBody()) {
      config += `  client_max_body_size ${this.nginxFormMaxBody()};\n\n`;
    }
    
    if (this.nginxFormSecurity()) {
      config += `  # Security Headers\n`;
      config += `  add_header X-Frame-Options "SAMEORIGIN" always;\n`;
      config += `  add_header X-XSS-Protection "1; mode=block" always;\n`;
      config += `  add_header X-Content-Type-Options "nosniff" always;\n`;
      config += `  add_header Referrer-Policy "no-referrer-when-downgrade" always;\n`;
      config += `  add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;\n\n`;
    }
    
    if (this.nginxFormGzip()) {
      config += `  # Gzip Compression\n`;
      config += `  gzip on;\n`;
      config += `  gzip_vary on;\n`;
      config += `  gzip_min_length 10240;\n`;
      config += `  gzip_proxied expired no-cache no-store private auth;\n`;
      config += `  gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;\n`;
      config += `  gzip_disable "MSIE [1-6]\\\\.";\n\n`;
    }
    
    if (this.nginxFormHttps()) {
      config += `  # HTTPS configuration (Uncomment and configure if SSL is available)\n`;
      config += `  # listen 443 ssl;\n`;
      config += `  # ssl_certificate /etc/ssl/certs/your_domain.crt;\n`;
      config += `  # ssl_certificate_key /etc/ssl/private/your_domain.key;\n\n`;
    }

    config += `  location / {\n`;
    config += `    proxy_pass http://localhost:${port};\n`;
    config += `    proxy_http_version 1.1;\n`;
    config += `    proxy_set_header Upgrade $http_upgrade;\n`;
    config += `    proxy_set_header Connection 'upgrade';\n`;
    config += `    proxy_set_header Host $host;\n`;
    config += `    proxy_cache_bypass $http_upgrade;\n`;
    config += `    proxy_set_header X-Real-IP $remote_addr;\n`;
    config += `    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n`;
    config += `    proxy_set_header X-Forwarded-Proto $scheme;\n`;
    config += `  }\n`;
    config += `}\n`;
    
    this.editCustomNginxConfig.set(config);
  }

  closeNginxDrawer() {
    this.showNginxDrawer.set(false);
    this.showingNginxHistory.set(false);
  }

  toggleNginxHistory() {
    if (this.showingNginxHistory()) {
      this.showingNginxHistory.set(false);
    } else {
      this.showingNginxHistory.set(true);
      this.loadNginxHistory();
    }
  }

  loadNginxHistory() {
    const proj = this.project();
    if (!proj) return;
    this.projectService.getNginxConfigHistory(proj._id).subscribe({
      next: (history) => this.nginxHistory.set(history),
      error: (err) => console.error('Failed to load nginx history', err),
    });
  }

  revertNginxConfig(version: any) {
    if (confirm('Are you sure you want to revert to this Nginx configuration?')) {
      this.editCustomNginxConfig.set(version.configContent);
      this.saveConfig();
      this.closeNginxDrawer();
    }
  }

  deployNewDist() {
    this.triggerLoading.set(true);
    this.configError.set('');
    
    // First, save the new distPath to the project
    this.projectService.updateProject(this.projectId(), { distPath: this.editDistPath() }).subscribe({
      next: (updatedProj) => {
        this.project.set(updatedProj);
        this.cfgResetDistUpload();
        this.showDistUploadModal.set(false);
        // Then trigger deployment
        this.onTriggerDeployment();
      },
      error: (err) => {
        this.triggerLoading.set(false);
        this.configError.set(err.error?.message || 'Failed to update dist path.');
      }
    });
  }

  handleDeployClick() {
    if (this.project()?.distPath) {
      this.showDistUploadModal.set(true);
      this.cfgResetDistUpload();
      this.configError.set('');
    } else {
      this.onTriggerDeployment();
    }
  }

  closeDistUploadModal() {
    this.showDistUploadModal.set(false);
    this.cfgResetDistUpload();
    this.configError.set('');
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
