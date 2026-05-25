import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Project {
  _id: string;
  name: string;
  gitUrl?: string;
  dockerImage?: string;
  distPath?: string;
  branch?: string;
  port: number;
  domain?: string;
  customNginxConfig?: string;
  env: Record<string, string>;
  createdAt: string;
  owner?: { _id: string; email: string } | string;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private http = inject(HttpClient);

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${environment.apiUrl}/projects`);
  }

  getProject(id: string): Observable<Project> {
    return this.http.get<Project>(`${environment.apiUrl}/projects/${id}`);
  }

  createProject(project: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(`${environment.apiUrl}/projects`, project);
  }

  updateProject(id: string, project: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${environment.apiUrl}/projects/${id}`, project);
  }

  deleteProject(id: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/projects/${id}`);
  }

  uploadDist(formData: FormData): Observable<{ distPath: string }> {
    return this.http.post<{ distPath: string }>(`${environment.apiUrl}/projects/upload-dist`, formData);
  }

  getNginxConfigHistory(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/projects/${id}/nginx-history`);
  }
}
