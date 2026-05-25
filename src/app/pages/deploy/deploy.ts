import { Component, signal, inject, OnInit, ElementRef, ViewChild } from '@angular/core';
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

  @ViewChild('folderInput') folderInputRef!: ElementRef<HTMLInputElement>;

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
  protected distPath = signal('');

  // Dist upload state
  protected distFiles = signal<{ file: File; path: string }[]>([]);
  protected distFolderName = signal('');
  protected distFileCount = signal(0);
  protected distUploading = signal(false);
  protected distUploaded = signal(false);
  protected isDragOver = signal(false);
  protected useManualDistPath = signal(false);

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
    // Reset dist state when switching
    if (m !== 'dist') {
      this.resetDistUpload();
    }
  }

  toggleDistInputMethod() {
    this.useManualDistPath.update(v => !v);
    this.error.set('');
    if (this.useManualDistPath()) {
      this.resetDistUpload();
    } else {
      this.distPath.set('');
    }
  }

  // ─── Drag-and-drop handlers ───────────────────────────────────────────────

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    this.error.set('');

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

    if (allFileData.length === 0) return;

    const folderName = allFileData[0].path.split('/')[0] || 'folder';
    this.distFolderName.set(folderName);
    this.distFileCount.set(allFileData.length);
    this.distFiles.set(allFileData);
    this.distUploaded.set(false);
    this.uploadDistFolder();
  }

  onFolderInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const fileList = input.files;
    if (!fileList || fileList.length === 0) return;

    const fileDataList: { file: File; path: string }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      fileDataList.push({
        file,
        path: (file as any).webkitRelativePath || file.name,
      });
    }

    const folderName = fileDataList[0]?.path.split('/')[0] || 'folder';
    this.distFolderName.set(folderName);
    this.distFileCount.set(fileDataList.length);
    this.distFiles.set(fileDataList);
    this.distUploaded.set(false);
    this.uploadDistFolder();

    // Reset input so same folder can be re-chosen
    input.value = '';
  }

  clickFolderInput() {
    this.folderInputRef?.nativeElement?.click();
  }

  resetDistUpload() {
    this.distFiles.set([]);
    this.distFolderName.set('');
    this.distFileCount.set(0);
    this.distUploaded.set(false);
    this.distUploading.set(false);
    this.distPath.set('');
  }

  uploadDistFolder() {
    const files = this.distFiles();
    if (!files.length) return;

    this.distUploading.set(true);
    this.error.set('');

    const formData = new FormData();
    for (const { file, path } of files) {
      formData.append('files', file, path);
    }

    this.projectService.uploadDist(formData).subscribe({
      next: (res) => {
        this.distPath.set(res.distPath);
        this.distUploading.set(false);
        this.distUploaded.set(true);
      },
      error: (err) => {
        this.distUploading.set(false);
        this.error.set('Upload failed: ' + (err.error?.message || err.message || 'Unknown error'));
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
          if (batch.length === 0) {
            resolve(all);
          } else {
            all.push(...batch);
            read();
          }
        });
      };
      read();
    });
  }

  // ─── Step navigation ──────────────────────────────────────────────────────

  goToConfig() {
    if (!this.projectName().trim()) {
      this.error.set('Project name is required.');
      return;
    }
    if (this.deployMethod() === 'git' && !this.gitUrl().trim()) {
      this.error.set('Git repository URL is required.');
      return;
    }
    if (this.deployMethod() === 'dist') {
      if (this.useManualDistPath()) {
        if (!this.distPath().trim()) {
          this.error.set('Please enter a server dist path.');
          return;
        }
      } else {
        if (!this.distUploaded()) {
          this.error.set('Please upload your dist folder before continuing.');
          return;
        }
      }
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
    this.envVars.update((v) => [...v, { key: '', value: '' }]);
  }

  removeEnvVar(i: number) {
    this.envVars.update((v) => v.filter((_, idx) => idx !== i));
  }

  updateEnvKey(i: number, key: string) {
    this.envVars.update((v) => v.map((e, idx) => (idx === i ? { ...e, key } : e)));
  }

  updateEnvValue(i: number, value: string) {
    this.envVars.update((v) => v.map((e, idx) => (idx === i ? { ...e, value } : e)));
  }

  getEnvVarsMap(): Record<string, string> {
    const map: Record<string, string> = {};
    this.envVars().forEach((e) => {
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
