import { HttpClient } from '@angular/common/http';
import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DxButtonModule, DxTextBoxModule, DxTemplateModule } from 'devextreme-angular';
import { TranslateService } from '@ngx-translate/core';

import { LoginResponse } from '../../models/auth/LoginResponse';
import { ApiResponse } from '../../models/auth/api-response.model';
import { SharedService } from '../../services/shared.service';
import { ToastType } from '../../components/toast/toast';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, DxTextBoxModule, DxButtonModule, DxTemplateModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  email = '';
  password = '';
  rememberMe = false;
  passwordMode: 'password' | 'text' = 'password';
  errorMessage = '';
  emailFocused = false;
  passwordFocused = false;

  passwordButtonOptions: any = {
    icon: 'eyeclose',
    stylingMode: 'contained',
    type: 'normal',
    onClick: () => this.togglePassword(),
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private sharedService: SharedService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) { }

  togglePassword() {
    this.passwordMode = this.passwordMode === 'password' ? 'text' : 'password';
  }
  isLoading = false;

  onLogin() {
    if (!this.email || !this.password) {
      this.sharedService.showToastMessage(ToastType.Warning, 'Please enter email and password');
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    this.http
      .post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/account/login`, {
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.cdr.detectChanges(); // ← force le re-render
          if (res.isSuccess && res.data) {
            const userId = res.data.user.id || res.data.user.email || 'default';
            const savedLanguage = localStorage.getItem(`language_${userId}`) || 'en';
            this.translate.use(savedLanguage);

            const role = res.data.user.role?.toUpperCase();
            if (role === 'ADMIN') {
              this.router.navigate(['/admin']);
            } else if (role === 'EMPLOYEE') {
              this.router.navigate(['/employee']);
            } else if (role === 'TEAMLEAD') {
              this.router.navigate(['/teamlead']);
            } else {
              this.sharedService.showToastMessage(ToastType.Warning, 'Role not recognized');
            }
          } else {
            this.errorMessage = res.error || res.message || 'Login failed';
            this.sharedService.showToastMessage(ToastType.Error, this.errorMessage);
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.cdr.detectChanges(); // ← ici aussi
          this.errorMessage = err.error?.message || err.error?.Message || err.error?.title || 'Login failed';
          this.sharedService.showToastMessage(ToastType.Error, this.errorMessage, 3000);
        },
      });
  }

  goToForgot() {
    this.router.navigate(['/forget-password']);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}