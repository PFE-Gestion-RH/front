import { Component, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SharedService } from '../../services/shared.service';
import { ToastType } from '../../components/toast/toast';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  protected sharedService = inject(SharedService);

  isSaving = false;

  profile = {
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    profilePictureBase64: null as string | null
  };

  viewMode = localStorage.getItem('viewMode') || 'grid';
  language = 'en';

  languages = [
    { label: 'Français', value: 'fr' },
    { label: 'English', value: 'en' }
  ];

  private getUserId(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || user.email || 'default';
  }

  get userProfilePicture(): string | null {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return this.profile.profilePictureBase64 ?? user.profilePicture ?? null;
  }

  get userInitials(): string {
    const f = this.profile.firstName?.[0] || '';
    const l = this.profile.lastName?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  }

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.profile.firstName = user.firstName || '';
    this.profile.lastName = user.lastName || '';
    this.profile.email = user.email || '';

    // ← langue par utilisateur
    const userId = this.getUserId();
    this.language = localStorage.getItem(`language_${userId}`) || 'en';
  }

  saveProfile(): void {
    if (this.isSaving) return;
    const token = this.sharedService.getToken();
    if (!token) {
      this.sharedService.showToastMessage(ToastType.Error, 'Session expirée');
      this.router.navigate(['/login']);
      return;
    }

    this.isSaving = true;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const body = {
      firstName: this.profile.firstName,
      lastName: this.profile.lastName,
      email: this.profile.email,
      currentPassword: this.profile.currentPassword,
      newPassword: this.profile.newPassword,
      confirmPassword: this.profile.confirmPassword,
      profilePictureBase64: this.profile.profilePictureBase64 ?? user.profilePicture ?? null
    };

    this.http.put(`${environment.apiUrl}/profile`, body, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: () => {
        const updatedUser = {
          ...user,
          firstName: this.profile.firstName,
          lastName: this.profile.lastName,
          email: this.profile.email,
          profilePicture: this.profile.profilePictureBase64 ?? user.profilePicture
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.isSaving = false;
        this.cdr.detectChanges();
        this.sharedService.showToastMessage(ToastType.Success, 'Profil mis à jour !');
        this.sharedService.refreshHeaderProfilePicture.update(_ => _ + 1)
      },
      error: (err) => {
        this.isSaving = false;
        this.cdr.detectChanges();
        this.sharedService.showToastMessage(ToastType.Error, err.error?.message || 'Erreur');
      }
    });
  }

  saveUISettings(): void {
    localStorage.setItem('viewMode', this.viewMode);
    this.sharedService.showToastMessage(ToastType.Success, 'View settings saved!');
  }

  saveLanguage(): void {
    const userId = this.getUserId();
    localStorage.setItem(`language_${userId}`, this.language); 
    this.translate.use(this.language);
    this.sharedService.showToastMessage(ToastType.Success,
      this.language === 'fr' ? 'Langue sauvegardée !' : 'Language saved!'
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e: any) => {
      const img = new Image();
      img.src = e.target.result;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 🔽 réduire dimensions (optionnel mais recommandé)
        const maxWidth = 300;
        const scaleSize = maxWidth / img.width;

        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 🔽 qualité (0.1 = très compressé, 1 = haute qualité)
        const quality = 0.6;

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

        this.profile.profilePictureBase64 = compressedBase64;
        this.cdr.detectChanges();

      };
    };

    reader.readAsDataURL(file);
  }
}