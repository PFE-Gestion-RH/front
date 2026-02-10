import { Routes } from '@angular/router';
import { AuthGuard } from './guard/auth-guard';
import { Dashboard } from './pages/Admin/dashboard/dashboard';
import { ForgetPassword } from './pages/forget-password/forget-password';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { ResetPassword } from './pages/reset-password/reset-password';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'admindashboard',
    component: Dashboard,
    canActivate: [AuthGuard],
  },
  {
    path: 'register',
    component: Register,
  },
  {
    path: 'forget-password',
    component: ForgetPassword,
  },
  {
    path: 'reset-password',
    component: ResetPassword,
  },
];
