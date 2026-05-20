import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Deployment {
  _id: string;
  project: string;
  status: 'PENDING' | 'BUILDING' | 'RUNNING' | 'FAILED' | 'STOPPED';
  containerId?: string;
  logs: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class DeploymentService {
  private http = inject(HttpClient);

  getDeployments(projectId: string): Observable<Deployment[]> {
    return this.http.get<Deployment[]>(`${environment.apiUrl}/deployments/project/${projectId}`);
  }

  getDeployment(id: string): Observable<Deployment> {
    return this.http.get<Deployment>(`${environment.apiUrl}/deployments/${id}`);
  }

  triggerDeployment(projectId: string): Observable<Deployment> {
    return this.http.post<Deployment>(`${environment.apiUrl}/deployments/project/${projectId}`, {});
  }

  rollbackDeployment(id: string): Observable<Deployment> {
    return this.http.post<Deployment>(`${environment.apiUrl}/deployments/${id}/rollback`, {});
  }
}
