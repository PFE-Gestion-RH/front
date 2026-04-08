import { CommonModule } from '@angular/common';
import { Component ,ChangeDetectorRef} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { DxButtonModule, DxTextBoxModule } from 'devextreme-angular';
import { SharedService } from '../../services/shared.service';
import { ToastType } from '../../components/toast/toast';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../../models/auth/api-response.model';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.html',
  styleUrls: ['./forget-password.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, DxTextBoxModule, DxButtonModule],
})

export class ForgetPassword {
  email = '';
  showEmailSent = false;
  emailFocused = false;
  isLoading = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private sharedService: SharedService,
    private cdr: ChangeDetectorRef 
  ) {}

  sendResetLink(): void {
    if (this.isLoading) return;

    if (!this.email) {
      this.sharedService.showToastMessage(ToastType.Warning, 'Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.sharedService.showToastMessage(ToastType.Warning, 'Please enter a valid email address.');
      return;
    }

    this.isLoading = true;

    this.http.post<ApiResponse<string>>(`${environment.apiUrl}/account/forgot-password`, { email: this.email })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.showEmailSent = true;
          this.sharedService.showToastMessage(ToastType.Success, res.message || 'Reset link sent successfully!', 4000);
          this.cdr.detectChanges(); 
        },
        error: (err) => {
          this.isLoading = false;
          this.sharedService.showToastMessage(ToastType.Error, err.error?.message || 'Failed to send reset link.', 4000);
          this.cdr.detectChanges(); 
        }
      });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}