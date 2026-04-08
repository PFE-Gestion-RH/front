import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { DxButtonModule, DxTextBoxModule } from 'devextreme-angular';
import { SharedService } from '../../services/shared.service';
import { ToastType } from '../../components/toast/toast';
import { ApiResponse } from '../../models/auth/api-response.model';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule, DxTextBoxModule, DxButtonModule],
})
export class ResetPassword implements OnInit {
  resetForm!: FormGroup;
  email = '';
  token = '';
  isSuccess = false;
  isExpired = false;

  newPasswordFocused = false;
  confirmPasswordFocused = false;
  newPasswordMode: 'password' | 'text' = 'password';
  confirmPasswordMode: 'password' | 'text' = 'password';
  newPasswordButtonOptions: any;
  confirmPasswordButtonOptions: any;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private sharedService: SharedService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'];
      this.token = params['token'];
      this.checkTokenLocally();
    });

    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatch.bind(this) });

    this.initPasswordButtons();
  }

private checkTokenLocally(): void {
  if (!this.token || !this.email) {
    this.isExpired = true;
    return;
  }

  try {
    const decoded: any = jwtDecode(this.token);
    const now = Math.floor(Date.now() / 1000);

    if (decoded.exp < now) {
      this.isExpired = true;
      return;
    }

    // verifie avec le token exact
    if (localStorage.getItem(`reset_used_${this.token}`) === 'true') {
      this.isExpired = true;
    }
  } catch {
    this.isExpired = true;
  }
}

  private initPasswordButtons(): void {
    this.newPasswordButtonOptions = {
      icon: 'eyeclose',
      stylingMode: 'text',
      type: 'default',
      onClick: () => this.toggleNewPassword(),
    };
    this.confirmPasswordButtonOptions = {
      icon: 'eyeclose',
      stylingMode: 'text',
      type: 'default',
      onClick: () => this.toggleConfirmPassword(),
    };
  }

  toggleNewPassword(): void {
    this.newPasswordMode = this.newPasswordMode === 'password' ? 'text' : 'password';
    this.newPasswordButtonOptions = {
      ...this.newPasswordButtonOptions,
      icon: this.newPasswordMode === 'password' ? 'eyeclose' : 'eyeopen',
    };
  }

  toggleConfirmPassword(): void {
    this.confirmPasswordMode = this.confirmPasswordMode === 'password' ? 'text' : 'password';
    this.confirmPasswordButtonOptions = {
      ...this.confirmPasswordButtonOptions,
      icon: this.confirmPasswordMode === 'password' ? 'eyeclose' : 'eyeopen',
    };
  }

  onPasswordChange(event: any, field: string): void {
    this.resetForm.get(field)?.setValue(event.value);
  }

  passwordsMatch(group: FormGroup) {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { notMatching: true };
  }

  onSubmit(): void {
    if (this.resetForm.invalid) {
      if (this.resetForm.errors?.['notMatching']) {
        this.sharedService.showToastMessage(ToastType.Warning, 'Passwords do not match.');
      } else {
        this.sharedService.showToastMessage(ToastType.Warning, 'Please fill in all fields correctly.');
      }
      return;
    }

    const dto = {
      email: this.email,
      token: encodeURIComponent(this.token),
      newPassword: this.resetForm.get('newPassword')?.value
    };

    this.http.post<ApiResponse<string>>(`${environment.apiUrl}/account/reset-password`, dto).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.isSuccess = true;
localStorage.setItem(`reset_used_${this.token}`, 'true');          this.sharedService.showToastMessage(ToastType.Success, res.message || 'Password reset successfully!', 3000);
          setTimeout(() => this.router.navigate(['/login']), 3000);
        } else {
          this.isExpired = true;
          this.sharedService.showToastMessage(ToastType.Error, res.error || 'Reset link already used or invalid.', 4000);
        }
      },
      error: (err) => {
        this.sharedService.showToastMessage(ToastType.Error, err.error?.message || 'Error resetting password', 3000);
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToForgot(): void {
    this.router.navigate(['/forget-password']);
  }
}