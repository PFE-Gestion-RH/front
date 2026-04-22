import { HttpClient } from '@angular/common/http';
import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DxButtonModule, DxTextBoxModule } from 'devextreme-angular';
import { TranslateService } from '@ngx-translate/core';
import { LoginResponse } from '../../models/auth/LoginResponse';
import { ApiResponse } from '../../models/auth/api-response.model';
import { SharedService } from '../../services/shared.service';
import { ToastType } from '../../components/toast/toast';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, DxTextBoxModule, DxButtonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  email = '';
  password = '';
  passwordMode: 'password' | 'text' = 'password';
  errorMessage = '';
  emailFocused = false;
  passwordFocused = false;
  isLoading = false;

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

  onLogin() {
    if (!this.email || !this.password) {
      this.sharedService.showToastMessage(ToastType.Warning, 'Please enter email and password');
      return;
    }
    this.isLoading = true;
    this.cdr.detectChanges();

    this.http.post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/account/login`, {
      email: this.email,
      password: this.password,
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.cdr.detectChanges();

        if (res.isSuccess && res.data) {
          this.sharedService.setUser(res.data.user, res.data.token);
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
          this.sharedService.showToastMessage(ToastType.Error, res.error || res.message || 'Login failed');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.cdr.detectChanges();
        this.sharedService.showToastMessage(ToastType.Error, err.error?.message || 'Login failed');
      }
    });
  }

  goToForgot() { this.router.navigate(['/forget-password']); }
  goToRegister() { this.router.navigate(['/register']); }
}