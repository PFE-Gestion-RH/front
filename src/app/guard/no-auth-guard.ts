import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const NoAuthGuard: CanActivateFn = () => {
  const router = inject(Router);

  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');

  if (token && userJson) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (Date.now() < payload.exp * 1000) {
        const user = JSON.parse(userJson);
        const role = user.role?.toUpperCase();
        if (role === 'ADMIN') router.navigate(['/admin']);
        else if (role === 'EMPLOYEE') router.navigate(['/employee']);
        else if (role === 'TEAMLEAD') router.navigate(['/teamlead']);
        return false;
      }
    } catch {}
  }

  return true;
};