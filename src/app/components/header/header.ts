import { ChangeDetectorRef, Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DxButtonModule, DxDropDownButtonModule, DxPopoverModule, DxPopupModule,
  DxTextBoxModule, DxFileUploaderModule, DxLoadIndicatorModule
} from 'devextreme-angular';
import { SharedService } from '../../services/shared.service';
import { HttpClient } from '@angular/common/http';
import { ToastType } from '../toast/toast';
import { environment } from '../../environments/environment';
import { SignalRService, StatusChangedEvent, NewRequestEvent } from '../../services/signalr.service';
import { Subscription } from 'rxjs';

export interface AppNotification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  read: boolean;
  createdAt: Date;
  rejectionReason?: string;  
   showDetails?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, DxButtonModule, DxPopoverModule,
    DxDropDownButtonModule, DxPopupModule, DxTextBoxModule, DxFileUploaderModule,
    DxLoadIndicatorModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy {
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private signalRService = inject(SignalRService);
  protected sharedService = inject(SharedService);

  showUserMenu = false;
  showProfileModal = false;
  showNotifications = false;
  isSaving = false;

  notifications: AppNotification[] = [];
  private notifIdCounter = 1;
  private statusSub!: Subscription;
  private newRequestSub!: Subscription;

  profile = {
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    profilePictureBase64: null as string | null
  };
toggleDetails(notif: AppNotification, event: MouseEvent): void {
  event.stopPropagation();
  notif.showDetails = !notif.showDetails;
  this.cdr.detectChanges();
}
  ngOnInit(): void {
    const token = this.sharedService.getToken();
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload['nameid'];
      const role = payload['role'];

      this.signalRService.startConnection(userId, role);
      this.loadNotificationsFromApi();
    }

    // ✅ Passer rejectionReason
    this.statusSub = this.signalRService.requestStatusChanged$.subscribe(event => {
      this.addNotification(
        event.message,
        this.getNotifType(event.newStatus),
        event.rejectionReason  // ✅
      );
      this.sharedService.showToastMessage(
        event.newStatus === 'Accepted' ? ToastType.Success :
          event.newStatus.includes('Rejected') ? ToastType.Error : ToastType.Info,
        event.message
      );
      this.cdr.detectChanges();
    });

    this.newRequestSub = this.signalRService.newRequestReceived$.subscribe(event => {
      this.addNotification(event.message, 'info');
      this.sharedService.showToastMessage(ToastType.Info, event.message);
      this.cdr.detectChanges();
    });
  }

  private loadNotificationsFromApi(): void {
    const token = this.sharedService.getToken();
    this.http.get<any>(`${environment.apiUrl}/notifications/my`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.notifications = res.data.map((n: any) => ({
            id: n.id,
            message: n.message,
            type: n.type === 'Absence' || n.type === 'Permission' ? 'info' : n.type,
            read: n.isRead,
            createdAt: new Date(n.createdAt),
            rejectionReason: n.rejectionReason  // ✅
          }));
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error loading notifications:', err)
    });
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
    this.newRequestSub?.unsubscribe();
    this.signalRService.stopConnection();
  }

  private getCurrentUserId(): string {
    const token = this.sharedService.getToken();
    if (!token) return 'anonymous';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload['nameid'] ?? 'anonymous';
  }

  private saveNotifications(): void {
    const userId = this.getCurrentUserId();
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(this.notifications));
  }

  // ✅ rejectionReason en paramètre optionnel
  addNotification(message: string, type: 'success' | 'error' | 'info', rejectionReason?: string): void {
    const notif: AppNotification = {
      id: this.notifIdCounter++,
      message,
      type,
      read: false,
      createdAt: new Date(),
      rejectionReason  // ✅
    };
    this.notifications = [notif, ...this.notifications].slice(0, 10);
    this.saveNotifications();
    this.cdr.detectChanges();
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(notif: AppNotification): void {
    const token = this.sharedService.getToken();
    this.http.patch(`${environment.apiUrl}/notifications/${notif.id}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe();
    notif.read = true;
    this.cdr.detectChanges();
  }

  markAllAsRead(): void {
    const token = this.sharedService.getToken();
    this.http.patch(`${environment.apiUrl}/notifications/read-all`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe();
    this.notifications.forEach(n => n.read = true);
    this.cdr.detectChanges();
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
  }

  getNotifType(status: string): 'success' | 'error' | 'info' {
    if (status === 'Accepted') return 'success';
    if (status.includes('Rejected')) return 'error';
    return 'info';
  }

  getNotifIcon(type: string): string {
    if (type === 'success') return 'dx-icon-check';
    if (type === 'error') return 'dx-icon-close';
    return 'dx-icon-info';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) this.showUserMenu = false;
    if (!target.closest('.notif-bell')) this.showNotifications = false;
  }

  get userName(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur';
  }

  get userRole(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role || '';
  }

  get userInitials(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const f = user.firstName?.[0] || '';
    const l = user.lastName?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  }

  get userProfilePicture(): string | null {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.profilePicture || null;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  openProfileModal() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.profile.firstName = user.firstName || '';
    this.profile.lastName = user.lastName || '';
    this.profile.email = user.email || '';
    this.profile.currentPassword = '';
    this.profile.newPassword = '';
    this.profile.confirmPassword = '';
    this.profile.profilePictureBase64 = null;
    this.isSaving = false;
    this.showProfileModal = true;
    this.showUserMenu = false;
  }

  saveProfile() {
    if (this.isSaving) return;

    const token = this.sharedService.getToken();
    if (!token) {
      this.sharedService.showToastMessage(ToastType.Error, 'Session expirée');
      this.router.navigate(['/login']);
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const body = {
      firstName: this.profile.firstName,
      lastName: this.profile.lastName,
      email: this.profile.email,
      currentPassword: this.profile.currentPassword,
      newPassword: this.profile.newPassword,
      confirmPassword: this.profile.confirmPassword,
      profilePictureBase64: this.profile.profilePictureBase64 ?? user.profilePicture ?? null
    };

    this.http.put(`${environment.apiUrl}/profile`, body, { headers }).subscribe({
      next: (res: any) => {
        const updatedUser = {
          ...user,
          firstName: this.profile.firstName,
          lastName: this.profile.lastName,
          email: this.profile.email,
          profilePicture: this.profile.profilePictureBase64 ?? user.profilePicture
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.showProfileModal = false;
        this.isSaving = false;
        this.cdr.detectChanges();
        this.sharedService.showToastMessage(ToastType.Success, 'Profil mis à jour avec succès');
      },
      error: (err) => {
        this.isSaving = false;
        this.cdr.detectChanges();
        this.sharedService.showToastMessage(ToastType.Error, err.error?.message || 'Une erreur est survenue');
      }
    });
  }

  onNativeFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.profile.profilePictureBase64 = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.profile.profilePictureBase64 = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  onFileSelected(event: any) {
    const file = event.value[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.profile.profilePictureBase64 = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  logout() {
    this.signalRService.stopConnection();
    this.sharedService.logout();
    this.router.navigate(['/login']);
  }
}