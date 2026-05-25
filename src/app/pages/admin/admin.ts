import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ProjectService, Project } from '../../services/project.service';
import { environment } from '../../../environments/environment';

interface Organization {
  _id: string;
  name: string;
  createdAt: string;
}

interface User {
  _id: string;
  email: string;
  role: string;
  organizationId?: string;
  permissions?: {
    canDeploy?: boolean;
    canEdit?: boolean;
    canView?: boolean;
  };
}

interface EditOrgState {
  orgId: string | null;
  currentName: string;
  newName: string;
  isEditing: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminComponent implements OnInit {
  protected authService = inject(AuthService);
  private userService = inject(UserService);
  private projectService = inject(ProjectService);
  private http = inject(HttpClient);

  protected get isAdmin() {
    return this.authService.currentUser()?.role === 'admin';
  }

  // Tabs
  protected activeTab = signal<'organizations' | 'users' | 'projects'>('organizations');
  protected showCreateModal = signal(false);

  // Organizations List
  protected organizations = signal<Organization[]>([]);
  protected loadingOrgs = signal(false);

  // Users List
  protected users = signal<User[]>([]);
  protected loadingUsers = signal(false);

  // Projects List
  protected projects = signal<Project[]>([]);
  protected loadingProjects = signal(false);

  // Edit Organization
  protected editOrgState = signal<EditOrgState>({
    orgId: null,
    currentName: '',
    newName: '',
    isEditing: false,
  });
  protected editLoading = signal(false);
  protected editError = signal('');

  // Create Org Admin Form
  protected email = signal('');
  protected password = signal('');
  protected organizationName = signal('');
  protected createLoading = signal(false);
  protected createError = signal('');
  protected createSuccess = signal('');

  ngOnInit() {
    this.loadOrganizations();
    this.loadUsers();
    this.loadProjects();
  }

  setTab(tab: 'organizations' | 'users' | 'projects') {
    this.activeTab.set(tab);
  }

  toggleCreateModal() {
    this.showCreateModal.update(v => !v);
    this.createError.set('');
    this.createSuccess.set('');
  }

  loadOrganizations() {
    this.loadingOrgs.set(true);
    this.http.get<Organization[]>(`${environment.apiUrl}/organizations`).subscribe({
      next: (data) => {
        this.organizations.set(data);
        this.loadingOrgs.set(false);
      },
      error: (err) => {
        this.loadingOrgs.set(false);
      },
    });
  }

  loadUsers() {
    this.loadingUsers.set(true);
    this.http.get<User[]>(`${environment.apiUrl}/users`).subscribe({
      next: (data) => {
        this.users.set(data);
        this.loadingUsers.set(false);
      },
      error: (err) => {
        this.loadingUsers.set(false);
      },
    });
  }

  loadProjects() {
    this.loadingProjects.set(true);
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        this.loadingProjects.set(false);
      },
      error: (err) => {
        this.loadingProjects.set(false);
      },
    });
  }

  onCreateOrgAdmin() {
    if (!this.email().trim() || !this.password().trim() || !this.organizationName().trim()) {
      this.createError.set('All fields are required.');
      return;
    }

    this.createLoading.set(true);
    this.createError.set('');
    this.createSuccess.set('');

    this.userService.createOrgAdmin({
      email: this.email().trim(),
      password: this.password(),
      organizationName: this.organizationName().trim(),
    }).subscribe({
      next: (response) => {
        this.createLoading.set(false);
        this.createSuccess.set(`Org admin created successfully! Email: ${response.user.email}`);
        this.resetForm();
        this.loadOrganizations();
        this.loadUsers();
        setTimeout(() => this.toggleCreateModal(), 2000);
      },
      error: (err) => {
        this.createLoading.set(false);
        this.createError.set(err.error?.message || 'Failed to create org admin.');
      },
    });
  }

  startEditOrg(org: Organization) {
    this.editOrgState.set({
      orgId: org._id,
      currentName: org.name,
      newName: org.name,
      isEditing: true,
    });
    this.editError.set('');
  }

  cancelEditOrg() {
    this.editOrgState.set({
      orgId: null,
      currentName: '',
      newName: '',
      isEditing: false,
    });
    this.editError.set('');
  }

  saveOrgName() {
    const state = this.editOrgState();
    if (!state.orgId || !state.newName.trim()) {
      this.editError.set('Organization name is required.');
      return;
    }

    this.editLoading.set(true);
    this.editError.set('');

    this.http.put(`${environment.apiUrl}/organizations/${state.orgId}`, { name: state.newName.trim() }).subscribe({
      next: () => {
        this.editLoading.set(false);
        this.cancelEditOrg();
        this.loadOrganizations();
      },
      error: (err) => {
        this.editLoading.set(false);
        this.editError.set(err.error?.message || 'Failed to update organization.');
      },
    });
  }

  private resetForm() {
    this.email.set('');
    this.password.set('');
    this.organizationName.set('');
  }
}
