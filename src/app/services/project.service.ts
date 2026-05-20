import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Project {
  _id: string;
  name: string;
  description?: string;
  gitUrl?: string;
  dockerImage?: string;
  branch?: string;
  port: number;
  domain?: string;
  envVariables: Record<string, string>;
  createdAt: string;
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
}
