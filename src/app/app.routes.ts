import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ProjectDetailComponent } from './pages/project-detail/project-detail';
import { DeployComponent } from './pages/deploy/deploy';
import { DockerEngineComponent } from './pages/docker-engine/docker-engine';
import { SettingsComponent } from './pages/settings/settings';
import { AdminComponent } from './pages/admin/admin';
import { OrgUsersComponent } from './pages/org-users/org-users';
import { ShellComponent } from './layout/shell/shell';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'deploy', component: DeployComponent },
      {
        path: 'project/:id',
        component: ProjectDetailComponent,
      },
      {
        path: 'docker',
        component: DockerEngineComponent,
      },
      {
        path: 'admin',
        component: AdminComponent,
      },
      {
        path: 'org-users',
        component: OrgUsersComponent,
      },
      {
        path: 'settings',
        component: SettingsComponent,
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
