import { Component, signal, inject, OnInit } from '@angular/core';
import { DockerService, DockerContainer } from '../../services/docker.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-docker-engine',
  standalone: true,
  imports: [],
  templateUrl: './docker-engine.html',
  styleUrl: './docker-engine.scss',
})
export class DockerEngineComponent implements OnInit {
  private dockerService = inject(DockerService);
  protected authService = inject(AuthService);

  protected get isAdmin() {
    return this.authService.currentUser()?.role === 'admin';
  }

  protected containers = signal<DockerContainer[]>([]);
  protected loading = signal(false);
  protected selectedContainerName = signal('');
  protected selectedContainerLogs = signal<string | null>(null);
  protected loadingLogs = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.dockerService.getContainers().subscribe({
      next: (data) => { this.containers.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  start(id: string) { this.dockerService.startContainer(id).subscribe(() => this.load()); }
  stop(id: string)  { this.dockerService.stopContainer(id).subscribe(() => this.load()); }
  restart(id: string) { this.dockerService.restartContainer(id).subscribe(() => this.load()); }

  viewLogs(c: DockerContainer) {
    this.selectedContainerName.set(c.projectName || c.names[0] || c.id.substring(0, 12));
    this.selectedContainerLogs.set('');
    this.loadingLogs.set(true);
    this.dockerService.getContainerLogs(c.id, 200).subscribe({
      next: (res) => { this.selectedContainerLogs.set(res.logs || 'No logs.'); this.loadingLogs.set(false); },
      error: (err) => { this.selectedContainerLogs.set(`Error: ${err.message}`); this.loadingLogs.set(false); },
    });
  }

  closeLogs() { this.selectedContainerLogs.set(null); }
}
