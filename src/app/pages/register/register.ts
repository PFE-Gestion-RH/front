import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastType } from '../../components/toast/toast';
import { DxButtonModule, DxTextBoxModule } from 'devextreme-angular';
import { ApiResponse } from '../../models/auth/api-response.model';
import { SharedService } from '../../services/shared.service';
import { environment } from '../../environments/environment';

type RegisterData = string;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, DxTextBoxModule, DxButtonModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register {
  LastName = '';
  FirstName = '';
  email = '';
  password = '';
  confirmPassword = '';
  employeeNumber = '';

  passwordMode: 'password' | 'text' = 'password';
  confirmPasswordMode: 'password' | 'text' = 'password';

  isLoading = false;
  emailFocused = false;
  passwordFocused = false;
  ConfirmpasswordFocused = false;
  FirstNameFocused = false;
  LastNameFocused = false;
  employeeNumberFocused = false;

  passwordButtonOptions: any;
  confirmPasswordButtonOptions: any;


  constructor(
    private http: HttpClient,
    private router: Router,
    private sharedService: SharedService
  ) {
    this.initPasswordButtons();
  }

  private initPasswordButtons() {
    this.passwordButtonOptions = {
      icon: 'eyeclose',
      stylingMode: 'text',
      onClick: () => this.togglePassword(),
    };
    this.confirmPasswordButtonOptions = {
      icon: 'eyeclose',
      stylingMode: 'text',
      onClick: () => this.toggleConfirmPassword(),
    };
  }

  togglePassword() {
    this.passwordMode = this.passwordMode === 'password' ? 'text' : 'password';
    this.passwordButtonOptions = {
      ...this.passwordButtonOptions,
      icon: this.passwordMode === 'password' ? 'eyeclose' : 'eyeopen',
    };
  }

  toggleConfirmPassword() {
    this.confirmPasswordMode = this.confirmPasswordMode === 'password' ? 'text' : 'password';
    this.confirmPasswordButtonOptions = {
      ...this.confirmPasswordButtonOptions,
      icon: this.confirmPasswordMode === 'password' ? 'eyeclose' : 'eyeopen',
    };
  }

  register() {
    if (this.isLoading) return;

    // 👇 employeeNumber ajouté à la validation
    if (!this.LastName || !this.FirstName || !this.employeeNumber || !this.email || !this.password || !this.confirmPassword) {
      this.sharedService.showToastMessage(ToastType.Warning, 'Please fill in all fields');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.sharedService.showToastMessage(ToastType.Error, 'Passwords do not match');
      return;
    }

    this.isLoading = true;

    // 👇 employeeNumber ajouté au body
    const body = {
      employeeNumber: this.employeeNumber.trim(),
      LastName: this.LastName,
      FirstName: this.FirstName,
      email: this.email,
      password: this.password
    };

    this.http.post<ApiResponse<RegisterData>>(`${environment.apiUrl}/account/register`, body)
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.sharedService.showToastMessage(ToastType.Success, res.message || 'Registration successful! Check your email.');
            setTimeout(() => this.router.navigate(['/login']), 2000);
          } else {
            this.sharedService.showToastMessage(ToastType.Error, res.error || res.message || 'Registration failed');
          }
          this.isLoading = false;
        },
        error: (err) => {
          this.sharedService.showToastMessage(ToastType.Error, err?.error?.error || err?.error?.message || 'Registration failed');
          this.isLoading = false;
        }
      });
  }


  goToSignIn() {
    this.router.navigate(['/login']);
  }
}