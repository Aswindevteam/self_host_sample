import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  _id: string;
  email: string;
  role: string;
  organizationId?: string;
  permissions?: {
    canDeploy: boolean;
    canEdit: boolean;
    canView: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);

  getOrgUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/users`);
  }

  updatePermissions(
    userId: string,
    permissions: { canDeploy: boolean; canEdit: boolean; canView: boolean }
  ): Observable<User> {
    return this.http.put<User>(`${environment.apiUrl}/users/${userId}/permissions`, permissions);
  }

  createOrgAdmin(data: { email: string; password: string; organizationName: string }): Observable<{ message: string; user: User }> {
    return this.http.post<{ message: string; user: User }>(
      `${environment.apiUrl}/users/create-org-admin`,
      data
    );
  }

  createOrgUser(data: { email: string; password: string; role?: string; permissions?: any }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/users/create-org-user`, data);
  }

  assignProjectToUser(data: { projectId: string; userId: string; canView?: boolean; canEdit?: boolean; canDeploy?: boolean }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/projects/assign`, data);
  }

  updateUserRole(userId: string, role: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/users/${userId}/role`, { role });
  }

  updateUserPermissions(userId: string, permissions: { canView: boolean; canEdit: boolean; canDeploy: boolean }): Observable<any> {
    return this.http.put(`${environment.apiUrl}/users/${userId}/permissions`, permissions);
  }
}
