import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';

export const AuthGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);

  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');

  if (!token || !userJson) {
    router.navigate(['/login']);
    return false;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (Date.now() > payload.exp * 1000) {
      localStorage.removeItem('token');  
      localStorage.removeItem('user');  
      router.navigate(['/login']);
      return false;
    }
  } catch {
    localStorage.removeItem('token');   
    localStorage.removeItem('user');    
    router.navigate(['/login']);
    return false;
  }

  const user = JSON.parse(userJson);
  const requiredRole = route.data['role'] as string;

  if (requiredRole && user.role.toUpperCase() !== requiredRole.toUpperCase()) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};