import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ProjectService, Project } from '../../services/project.service';
import { environment } from '../../../environments/environment';

interface OrgUser {
  _id: string;
  email: string;
  role: string;
  permissions?: {
    canDeploy?: boolean;
    canEdit?: boolean;
    canView?: boolean;
  };
}

interface ProjectAssignment {
  _id: string;
  projectId: string;
  projectName: string;
  canView: boolean;
  canEdit: boolean;
  canDeploy: boolean;
}

@Component({
  selector: 'app-org-users',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './org-users.html',
  styleUrl: './org-users.scss',
})
export class OrgUsersComponent implements OnInit {
  protected authService = inject(AuthService);
  private userService = inject(UserService);
  private projectService = inject(ProjectService);
  private http = inject(HttpClient);

  protected get isOrgAdmin() {
    return this.authService.currentUser()?.role === 'org-admin';
  }

  // Users List
  protected users = signal<OrgUser[]>([]);
  protected loadingUsers = signal(false);

  // Edit User
  protected editingUserId = signal<string | null>(null);
  protected editUserRole = signal('user');
  protected editUserCanView = signal(true);
  protected editUserCanEdit = signal(true);
  protected editUserCanDeploy = signal(true);
  protected editLoading = signal(false);
  protected editError = signal('');
  protected editSuccess = signal('');

  // Project Assignments per User
  protected userProjectAssignments = signal<Map<string, ProjectAssignment[]>>(new Map());
  protected loadingAssignments = signal(false);

  // Edit Assignment
  protected editingAssignmentId = signal<string | null>(null);
  protected editAssignmentCanView = signal(true);
  protected editAssignmentCanEdit = signal(true);
  protected editAssignmentCanDeploy = signal(true);
  protected editAssignmentLoading = signal(false);

  // Modal Add Project
  protected modalAddProjectId = signal('');
  protected modalAddCanView = signal(true);
  protected modalAddCanEdit = signal(true);
  protected modalAddCanDeploy = signal(true);

  // Project Search
  protected projectSearchQuery = signal('');
  protected filteredProjects = signal<Project[]>([]);
  protected selectedProjectsToAdd = signal<Project[]>([]);
  protected showProjectDropdown = signal(false);

  // Projects List
  protected projects = signal<Project[]>([]);
  protected loadingProjects = signal(false);

  // Create User Form
  protected email = signal('');
  protected password = signal('');
  protected role = signal('user');
  protected canDeploy = signal(true);
  protected canEdit = signal(true);
  protected canView = signal(true);
  protected createLoading = signal(false);
  protected createError = signal('');
  protected createSuccess = signal('');

  // Assign Project Form
  protected assignProjectId = signal('');
  protected assignUserId = signal('');
  protected assignCanView = signal(true);
  protected assignCanEdit = signal(true);
  protected assignCanDeploy = signal(true);
  protected assignLoading = signal(false);
  protected assignError = signal('');
  protected assignSuccess = signal('');

  ngOnInit() {
    this.loadUsers();
    this.loadProjects();
  }

  loadUsers() {
    this.loadingUsers.set(true);
    this.http.get<OrgUser[]>(`${environment.apiUrl}/users`).subscribe({
      next: (data) => {
        this.users.set(data);
        this.loadingUsers.set(false);
        // Load project assignments for each user
        data.forEach(user => this.loadUserProjectAssignments(user._id));
      },
      error: () => {
        this.loadingUsers.set(false);
      },
    });
  }

  loadUserProjectAssignments(userId: string) {
    this.http.get<any[]>(`${environment.apiUrl}/projects/assignments/user/${userId}`).subscribe({
      next: (data) => {
        const assignments = data.map((a: any) => ({
          _id: a._id,
          projectId: a.projectId,
          projectName: a.projectName || a.projectId,
          canView: a.canView,
          canEdit: a.canEdit,
          canDeploy: a.canDeploy,
        }));
        const currentMap = this.userProjectAssignments();
        currentMap.set(userId, assignments);
        this.userProjectAssignments.set(new Map(currentMap));
      },
      error: () => {
        const currentMap = this.userProjectAssignments();
        currentMap.set(userId, []);
        this.userProjectAssignments.set(new Map(currentMap));
      },
    });
  }

  getVisibleProjects(userId: string): ProjectAssignment[] {
    const assignments = this.userProjectAssignments().get(userId) || [];
    return assignments.slice(0, 3);
  }

  getHiddenProjectsCount(userId: string): number {
    const assignments = this.userProjectAssignments().get(userId) || [];
    return Math.max(0, assignments.length - 3);
  }

  viewUser(user: OrgUser) {
    // Navigate to user details or show user info
    console.log('View user:', user);
  }

  deployUser(user: OrgUser) {
    // Navigate to deploy page for this user
    console.log('Deploy user:', user);
  }

  loadProjects() {
    this.loadingProjects.set(true);
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        this.loadingProjects.set(false);
      },
      error: () => {
        this.loadingProjects.set(false);
      },
    });
  }

  onCreateUser() {
    if (!this.email().trim() || !this.password().trim()) {
      this.createError.set('Email and password are required.');
      return;
    }

    this.createLoading.set(true);
    this.createError.set('');
    this.createSuccess.set('');

    this.userService.createOrgUser({
      email: this.email().trim(),
      password: this.password(),
      role: this.role(),
      permissions: {
        canDeploy: this.canDeploy(),
        canEdit: this.canEdit(),
        canView: this.canView(),
      },
    }).subscribe({
      next: () => {
        this.createLoading.set(false);
        this.createSuccess.set(`User ${this.email()} created successfully!`);
        this.resetCreateForm();
        this.loadUsers();
      },
      error: (err) => {
        this.createLoading.set(false);
        this.createError.set(err.error?.message || 'Failed to create user.');
      },
    });
  }

  onAssignProject() {
    if (!this.assignProjectId() || !this.assignUserId()) {
      this.assignError.set('Project and user are required.');
      return;
    }

    this.assignLoading.set(true);
    this.assignError.set('');
    this.assignSuccess.set('');

    this.userService.assignProjectToUser({
      projectId: this.assignProjectId(),
      userId: this.assignUserId(),
      canView: this.assignCanView(),
      canEdit: this.assignCanEdit(),
      canDeploy: this.assignCanDeploy(),
    }).subscribe({
      next: () => {
        this.assignLoading.set(false);
        this.assignSuccess.set('Project assigned successfully!');
        this.resetAssignForm();
      },
      error: (err) => {
        this.assignLoading.set(false);
        this.assignError.set(err.error?.message || 'Failed to assign project.');
      },
    });
  }

  private resetCreateForm() {
    this.email.set('');
    this.password.set('');
    this.role.set('user');
    this.canDeploy.set(true);
    this.canEdit.set(true);
    this.canView.set(true);
  }

  private resetAssignForm() {
    this.assignProjectId.set('');
    this.assignUserId.set('');
    this.assignCanView.set(true);
    this.assignCanEdit.set(true);
    this.assignCanDeploy.set(true);
  }

  startEditUser(user: OrgUser) {
    this.editingUserId.set(user._id);
    this.editUserRole.set(user.role || 'user');
    this.editUserCanView.set(user.permissions?.canView ?? true);
    this.editUserCanEdit.set(user.permissions?.canEdit ?? true);
    this.editUserCanDeploy.set(user.permissions?.canDeploy ?? true);
    this.editError.set('');
    this.editSuccess.set('');
  }

  openEditModal(user: OrgUser) {
    this.startEditUser(user);
    this.modalAddProjectId.set('');
    this.modalAddCanView.set(true);
    this.modalAddCanEdit.set(true);
    this.modalAddCanDeploy.set(true);
    this.projectSearchQuery.set('');
    this.selectedProjectsToAdd.set([]);
    this.showProjectDropdown.set(false);
    this.filteredProjects.set(this.projects());
  }

  filterProjects() {
    const query = this.projectSearchQuery().toLowerCase();
    if (!query) {
      this.filteredProjects.set(this.projects());
    } else {
      const filtered = this.projects().filter(p =>
        p.name.toLowerCase().includes(query)
      );
      this.filteredProjects.set(filtered);
    }
    this.showProjectDropdown.set(true);
  }

  isProjectAssigned(projectId: string): boolean {
    const userId = this.editingUserId();
    if (!userId) return false;
    const assignments = this.userProjectAssignments().get(userId) || [];
    return assignments.some(a => a.projectId === projectId);
  }

  selectProjectToAdd(project: Project) {
    if (this.isProjectAssigned(project._id)) return;
    if (this.selectedProjectsToAdd().some(p => p._id === project._id)) return;
    this.selectedProjectsToAdd.set([...this.selectedProjectsToAdd(), project]);
    this.projectSearchQuery.set('');
    this.showProjectDropdown.set(false);
  }

  removeProjectFromSelection(projectId: string) {
    this.selectedProjectsToAdd.set(
      this.selectedProjectsToAdd().filter(p => p._id !== projectId)
    );
  }

  addSelectedProjects() {
    const userId = this.editingUserId();
    if (!userId || this.selectedProjectsToAdd().length === 0) return;

    let completed = 0;
    const total = this.selectedProjectsToAdd().length;

    this.selectedProjectsToAdd().forEach(project => {
      this.userService.assignProjectToUser({
        projectId: project._id,
        userId,
        canView: this.modalAddCanView(),
        canEdit: this.modalAddCanEdit(),
        canDeploy: this.modalAddCanDeploy(),
      }).subscribe({
        next: () => {
          completed++;
          if (completed === total) {
            this.selectedProjectsToAdd.set([]);
            this.loadUserProjectAssignments(userId);
          }
        },
        error: (err) => {
          alert(err.error?.message || 'Failed to add project.');
        },
      });
    });
  }

  closeEditModal() {
    this.editingUserId.set(null);
    this.editError.set('');
    this.editSuccess.set('');
    this.cancelEditAssignment();
  }

  onSaveUser() {
    const userId = this.editingUserId();
    if (!userId) return;

    this.editLoading.set(true);
    this.editError.set('');
    this.editSuccess.set('');

    this.userService.updateUserRole(userId, this.editUserRole()).subscribe({
      next: () => {
        this.userService.updateUserPermissions(userId, {
          canView: this.editUserCanView(),
          canEdit: this.editUserCanEdit(),
          canDeploy: this.editUserCanDeploy(),
        }).subscribe({
          next: () => {
            this.editLoading.set(false);
            this.editSuccess.set('User updated successfully!');
            this.closeEditModal();
            this.loadUsers();
          },
          error: (err) => {
            this.editLoading.set(false);
            this.editError.set(err.error?.message || 'Failed to update user permissions.');
          },
        });
      },
      error: (err) => {
        this.editLoading.set(false);
        this.editError.set(err.error?.message || 'Failed to update user role.');
      },
    });
  }

  onAddProjectFromModal() {
    const userId = this.editingUserId();
    const projectId = this.modalAddProjectId();
    if (!userId || !projectId) {
      alert('Please select a project');
      return;
    }

    this.userService.assignProjectToUser({
      projectId,
      userId,
      canView: this.modalAddCanView(),
      canEdit: this.modalAddCanEdit(),
      canDeploy: this.modalAddCanDeploy(),
    }).subscribe({
      next: () => {
        this.modalAddProjectId.set('');
        this.modalAddCanView.set(true);
        this.modalAddCanEdit.set(true);
        this.modalAddCanDeploy.set(true);
        this.loadUserProjectAssignments(userId);
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to add project.');
      },
    });
  }

  removeAssignment(assignmentId: string, userId: string) {
    if (!confirm('Are you sure you want to remove this project assignment?')) return;

    this.userService.removeProjectAssignment(assignmentId).subscribe({
      next: () => {
        this.loadUserProjectAssignments(userId);
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to remove assignment.');
      },
    });
  }

  startEditAssignment(assignment: ProjectAssignment) {
    this.editingAssignmentId.set(assignment._id);
    this.editAssignmentCanView.set(assignment.canView);
    this.editAssignmentCanEdit.set(assignment.canEdit);
    this.editAssignmentCanDeploy.set(assignment.canDeploy);
  }

  cancelEditAssignment() {
    this.editingAssignmentId.set(null);
  }

  onSaveAssignment(assignmentId: string, userId: string) {
    this.editAssignmentLoading.set(true);

    this.userService.updateProjectAssignment(assignmentId, {
      canView: this.editAssignmentCanView(),
      canEdit: this.editAssignmentCanEdit(),
      canDeploy: this.editAssignmentCanDeploy(),
    }).subscribe({
      next: () => {
        this.editAssignmentLoading.set(false);
        this.cancelEditAssignment();
        this.loadUserProjectAssignments(userId);
      },
      error: (err) => {
        this.editAssignmentLoading.set(false);
        alert(err.error?.message || 'Failed to update assignment.');
      },
    });
  }
}
