import { Routes } from '@angular/router';
import { Users } from './pages/users/users';
import { Products } from './pages/products/products';

export const routes: Routes = [
  { path: 'users', component: Users },
  { path: 'products', component: Products },
  { path: '', redirectTo: '/users', pathMatch: 'full' }
];
