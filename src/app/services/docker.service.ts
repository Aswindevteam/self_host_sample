import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DockerContainer {
  id: string;
  names: string[];
  image: string;
  state: string;
  status: string;
  ports: any[];
  projectName?: string;
  deploymentId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DockerService {
  private http = inject(HttpClient);

  getContainers(): Observable<DockerContainer[]> {
    return this.http.get<DockerContainer[]>(`${environment.apiUrl}/docker/containers`);
  }

  startContainer(id: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/docker/containers/${id}/start`, {});
  }

  stopContainer(id: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/docker/containers/${id}/stop`, {});
  }

  restartContainer(id: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/docker/containers/${id}/restart`, {});
  }

  getContainerLogs(id: string, tail = 200): Observable<{ logs: string }> {
    return this.http.get<{ logs: string }>(`${environment.apiUrl}/docker/containers/${id}/logs?tail=${tail}`);
  }
}
