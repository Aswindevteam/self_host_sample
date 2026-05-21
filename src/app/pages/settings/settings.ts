import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService, User } from '../../services/user.service';
import { ProjectService, Project } from '../../services/project.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent implements OnInit {
  protected authService = inject(AuthService);
  private userService = inject(UserService);
  private projectService = inject(ProjectService);

  // Users & Projects Lists
  protected users = signal<User[]>([]);
  protected projects = signal<Project[]>([]);
  protected loadingUsers = signal(false);
  protected loadingProjects = signal(false);

  // Organization info
  protected orgName = signal<string>('');
  protected orgId = signal<string>('');

  // Edit Assignment State
  protected editingUserId = signal<string | null>(null);
  protected selectedProjectIds = signal<Record<string, boolean>>({});
  protected savingUser = signal<string | null>(null);
  protected message = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  // Permission toggles for the user being edited
  protected editCanDeploy = signal(true);
  protected editCanEdit = signal(true);
  protected editCanView = signal(true);

  protected get isAdmin() {
    return this.authService.currentUser()?.role === 'ADMIN';
  }

  ngOnInit() {
    this.loadOrganizationInfo();
    if (this.isAdmin) {
      this.loadUsersAndProjects();
    }
  }

  loadOrganizationInfo() {
    const user = this.authService.currentUser();
    if (user && user.organizationId) {
      this.orgId.set(user.organizationId);
      this.authService.getOrganization(user.organizationId).subscribe({
        next: (org) => {
          if (org && org.name) {
            this.orgName.set(org.name);
          } else {
            this.orgName.set('');
          }
        },
        error: () => {
          this.orgName.set('');
        }
      });
    }
  }

  updateOrganizationName() {
    const newName = this.orgName();
    // Call auth service to update; stub method
    this.authService.updateOrganizationName(this.orgId(), newName).subscribe({
      next: () => {
        // success feedback
        this.message.set({ text: 'Organization name updated', type: 'success' });
      },
      error: (err) => {
        this.message.set({ text: 'Failed to update organization: ' + (err.error?.message || err.message), type: 'error' });
      }
    });
  }

  loadUsersAndProjects() {
    this.loadingUsers.set(true);
    this.loadingProjects.set(true);
    this.message.set(null);

    this.userService.getOrgUsers().subscribe({
      next: (usersList) => {
        this.users.set(usersList);
        this.loadingUsers.set(false);
      },
      error: (err) => {
        this.loadingUsers.set(false);
        this.message.set({ text: 'Failed to load users: ' + (err.error?.message || err.message), type: 'error' });
      }
    });

    this.projectService.getProjects().subscribe({
      next: (projectsList) => {
        this.projects.set(projectsList);
        this.loadingProjects.set(false);
      },
      error: (err) => {
        this.loadingProjects.set(false);
        this.message.set({ text: 'Failed to load projects: ' + (err.error?.message || err.message), type: 'error' });
      }
    });
  }

  startEditPermissions(user: User) {
    this.editingUserId.set(user._id);
    this.message.set(null);
    // Initialize permission toggles from user's current permissions
    this.editCanDeploy.set(user.permissions?.canDeploy !== false);
    this.editCanEdit.set(user.permissions?.canEdit !== false);
    this.editCanView.set(user.permissions?.canView !== false);
  }

  cancelEdit() {
    this.editingUserId.set(null);
    this.editCanDeploy.set(true);
    this.editCanEdit.set(true);
    this.editCanView.set(true);
  }

  savePermissions(userId: string) {
    this.savingUser.set(userId);
    this.message.set(null);

    this.userService.updatePermissions(userId, {
      canDeploy: this.editCanDeploy(),
      canEdit: this.editCanEdit(),
      canView: this.editCanView(),
    }).subscribe({
      next: () => {
        this.savingUser.set(null);
        this.editingUserId.set(null);
        this.message.set({ text: 'Permissions updated successfully!', type: 'success' });
        // Refresh local state
        this.loadUsersAndProjects();
      },
      error: (err) => {
        this.savingUser.set(null);
        this.message.set({ text: 'Failed to update permissions: ' + (err.error?.message || err.message), type: 'error' });
      }
    });
  }
}
