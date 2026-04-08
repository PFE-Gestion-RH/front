import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { DxButtonModule, DxLoadIndicatorModule } from 'devextreme-angular';
import { SharedService } from '../../services/shared.service';
import { ToastType } from '../../components/toast/toast';
import { ApiResponse } from '../../models/auth/api-response.model';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-activate-account',
  standalone: true,
  templateUrl: './activate-account.html',
  styleUrls: ['./activate-account.scss'],
  imports: [CommonModule, HttpClientModule, DxButtonModule, DxLoadIndicatorModule, RouterModule],
})
export class ActivateAccount implements OnInit {
  loading = true;
  isSuccess = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private sharedService: SharedService,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const email = this.route.snapshot.queryParamMap.get('email');

    if (token && email) {
      this.activateAccount(token, email);
    } else {
      this.loading = false;
      this.sharedService.showToastMessage(ToastType.Error, 'Invalid activation link. Missing token or email.');
    }
  }

private activateAccount(token: string, email: string): void {
  this.http
    .post<ApiResponse<string>>(`${environment.apiUrl}/account/activate-account`, { token, email })
    .subscribe({
      next: (res) => {
        this.loading = false;
        if (res.isSuccess) {
          this.isSuccess = true;
          this.sharedService.showToastMessage(ToastType.Success, res.message || 'Account activated successfully!', 5000);
          setTimeout(() => this.router.navigate(['/login']), 5000);
        } else {
          this.isSuccess = false;
          this.sharedService.showToastMessage(ToastType.Error, res.error || 'Activation failed.', 5000);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.isSuccess = false;
        this.sharedService.showToastMessage(ToastType.Error, err.error?.message || 'Connection error.', 5000);
        this.cdr.detectChanges();
      },
    });
}

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}