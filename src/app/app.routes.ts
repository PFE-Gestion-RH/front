import { Routes } from '@angular/router';
import { AuthGuard } from './guard/auth-guard';
import { Dashboard } from './pages/Admin/dashboard/dashboard';
import { ForgetPassword } from './pages/forget-password/forget-password';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Employeedashboard } from './pages/Employee/employeedashboard/employeedashboard';
import { ActivateAccount } from './pages/activate-account/activate-account';
import { Layout } from './components/layout/layout';
import { NoAuthGuard } from './guard/no-auth-guard';
import { Users } from './pages/Admin/users/users';
import { Teams } from './pages/Admin/teams/teams';
import { MyAbsences } from './pages/Employee/myAbsences/myAbsences';
import { MyPermissions } from './pages/Employee/myPermissions/myPermissions';
import { LeaveCategories } from './pages/Admin/leave-categories/leave-categories';
import { CalendarComponent } from './pages/calendar/calendar';
import { TeamPermissions } from './pages/TeamLead/team-permissions/team-permissions';
import { AdminAbsences } from './pages/Admin/admin-absences/admin-absences';
import { AdminPermissions } from './pages/Admin/admin-permissions/admin-permissions';
import { TeamAbsences } from './pages/TeamLead/team-absences/team-absences';
import { PublicHolidays } from './pages/Admin/publicholidays/publicholidays';
export { MyAbsences as myabsences } from './pages/Employee/myAbsences/myAbsences';
export { MyPermissions as mypermissions } from './pages/Employee/myPermissions/myPermissions';
 export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login, canActivate: [NoAuthGuard] },
  { path: 'register', component: Register, canActivate: [NoAuthGuard] },
  { path: 'forget-password', component: ForgetPassword, canActivate: [NoAuthGuard] },
  { path: 'reset-password', component: ResetPassword, canActivate: [NoAuthGuard] },
  { path: 'activate-account', component: ActivateAccount, canActivate: [NoAuthGuard] },
  {
    path: '',
    component: Layout,
    canActivate: [AuthGuard],
    children: [
      // Admin
      { path: 'admin', component: Dashboard, data: { role: 'Admin' } },
      { path: 'admin/users', component: Users, data: { role: 'Admin' } },
      { path: 'admin/teams', component: Teams, data: { role: 'Admin' } },
      { path: 'admin/leave-categories', component: LeaveCategories, data: { role: 'Admin' } },
      { path: 'admin/calendar', component: CalendarComponent, data: { role: 'Admin' } },
      { path: 'admin/absences', component: AdminAbsences, data: { role: 'Admin' } },
{ path: 'admin/permissions', component: AdminPermissions, data: { role: 'Admin' } },
{ path: 'admin/publicholidays', component: PublicHolidays, data: { role: 'Admin' } },

      // Teamlead
      { path: 'teamlead', component: CalendarComponent, data: { role: 'Teamlead' } },
      { path: 'teamlead/calendar', component: CalendarComponent, data: { role: 'Teamlead' } },
      { path: 'teamlead/permissions', component: TeamPermissions, data: { role: 'Teamlead' } },
      { path: 'teamlead/absences', component: TeamAbsences, data: { role: 'Teamlead' } },
            { path: 'teamlead/myabsences', component: MyAbsences, data: { role: 'Teamlead' } },
      { path: 'teamlead/mypermissions', component: MyPermissions, data: { role: 'Teamlead' } },


      // Employee
      { path: 'employee', component: Employeedashboard, data: { role: 'Employee' } },
      { path: 'employee/absences', component: MyAbsences, data: { role: 'Employee' } },
      { path: 'employee/permissions', component: MyPermissions, data: { role: 'Employee' } },
      { path: 'employee/calendar', component: CalendarComponent, data: { role: 'Employee' } },
    ]
  },
];