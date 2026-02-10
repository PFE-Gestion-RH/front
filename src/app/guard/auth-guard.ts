import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const AuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Récupère userInfo dans le localStorage
  const localData = JSON.parse(localStorage.getItem('userInfo') ?? '{}');

  if (!localData?.token) {
    // pas connecté → redirige vers login
    router.navigate(['/login']);
    return false;
  }

  // connecté → accès autorisé
  return true;
};
