import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DxButtonModule, DxTextBoxModule } from 'devextreme-angular';

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
  rememberMe = false;
  passwordMode: 'password' | 'text' = 'password';
  errorMessage = '';
  emailFocused = false;
  passwordFocused = false;

  passwordButtonOptions: any = {
    icon: 'eyeclose',
    stylingMode: 'contained',
    type:'normal',
    onClick: () => this.togglePassword(),
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private sharedService: SharedService
  ) {}

  togglePassword() {
    this.passwordMode = this.passwordMode === 'password' ? 'text' : 'password';
    this.passwordButtonOptions = {
      icon: this.passwordMode === 'password' ? 'eyeclose' : 'eyeopen',
      stylingMode: 'text',
      onClick: () => this.togglePassword(),
    };
  }

  onLogin() {
    if (!this.email || !this.password) {
      this.sharedService.showToastMessage(ToastType.Warning, 'Please enter email and password');
      return;
    }

    this.errorMessage = '';

    this.http
      .post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/account/login`, {
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.sharedService.setUser(res.data.user, res.data.token);

            const role = res.data.user.role?.toUpperCase();

          if (role === 'ADMIN') {
    this.sharedService.showToastMessage(ToastType.Success, 'Login successful!');
    this.router.navigate(['/admin']); 
} else if (role === 'EMPLOYEE') {
    this.sharedService.showToastMessage(ToastType.Success, 'Login successful!');
    this.router.navigate(['/employee']); 
} else if (role === 'TEAMLEAD') {
    this.sharedService.showToastMessage(ToastType.Success, 'Login successful!');
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