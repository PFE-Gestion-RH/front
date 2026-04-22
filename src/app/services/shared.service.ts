import { Injectable, signal } from '@angular/core';
import { User, UserRole } from '../models/auth/user.model';
import { ToastType } from '../components/toast/toast';

@Injectable({ providedIn: 'root' })
export class SharedService {

  public showToast = signal(false)
  public sideNavOpen = signal(window.innerWidth > 1024)
  public toastType = signal<ToastType>(ToastType.Success)
  public toastMessage = signal('')
  public refreshHeaderProfilePicture = signal(0)
  public viewMode = signal<'grid' | 'card'>('grid');
  private toastTimeOut: number;

  constructor() { }

  public getConnectedRole(): UserRole | undefined {
    const userJson = localStorage.getItem('user');
    if (!userJson) return undefined;
    const user: User = JSON.parse(userJson);
    return user.role;
  }

  public getToken(): string | null {
    return localStorage.getItem('token');
  }

  public setUser(user: User, token: string): void {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  }

  public logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  public showToastMessage(type: ToastType, message: string, timeout: number = 3000): void {
    this.toastType.set(type)
    this.toastMessage.set(message)
    this.showToast.set(true)

    if (this.toastTimeOut) clearTimeout(this.toastTimeOut)

    this.toastTimeOut = setTimeout(() => {
      this.showToast.set(false)
    }, timeout)
  }

  public toggleSideNav(state?: boolean): void {
    if (state !== undefined) {
      this.sideNavOpen.set(state)
    } else {
      this.sideNavOpen.update((value) => !value)
    }
  }
}