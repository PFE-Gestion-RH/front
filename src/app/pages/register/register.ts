import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastType } from '../../components/toast/toast';
import { ApiResponse } from '../../models/auth/api-response.model';
import { SharedService } from '../../services/shared.service';
import { environment } from '../../environments/environment';
import { DxButtonModule, DxTextBoxModule, DxNumberBoxModule, DxValidatorModule } from 'devextreme-angular';
import { DxiValidationRuleModule } from 'devextreme-angular/ui/nested';
type RegisterData = string;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, DxTextBoxModule, DxButtonModule, DxNumberBoxModule, DxValidatorModule, DxiValidationRuleModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register {
  LastName = '';
  FirstName = '';
  email = '';
  password = '';
  confirmPassword = '';
  employeeNumber: number = 0;
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
  }

  toggleConfirmPassword() {
    this.confirmPasswordMode = this.confirmPasswordMode === 'password' ? 'text' : 'password';
  }


  register() {
    if (this.isLoading) return;

    if (!this.LastName || !this.FirstName || !this.employeeNumber || !this.email || !this.password || !this.confirmPassword) {
      this.sharedService.showToastMessage(ToastType.Warning, 'Please fill in all fields correctly');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.sharedService.showToastMessage(ToastType.Error, 'Passwords do not match');
      return;
    }

    this.isLoading = true;

    const body = {
      employeeNumber: this.employeeNumber,
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