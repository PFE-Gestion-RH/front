import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  DxChartModule, DxPieChartModule, DxDataGridModule,
  DxButtonModule, DxLoadIndicatorModule, DxToastModule
} from 'devextreme-angular';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

interface AdminKpi {
  totalEmployees: number; absentToday: number; presentToday: number;
  pendingRequests: number; pendingAbsences: number; pendingPermissions: number; presentBreakdown: string;
  employeeBreakdown: string; absentBreakdown: string;

}
interface AbsenceTrendPoint { month: string; count: number; }
interface AbsenceType { type: string; count: number; percentage: number; }
interface DepartmentComparison {
  department: string;
  absenceCount: number;
  permissionCount: number;
  employeeCount: number;
}
interface RecentRequest {
  id: number; employeeName: string; type: string;
  startDate: string; endDate: string; status: string;
}
interface AdminDashboard {
  kpi: AdminKpi;
  absenceTrend: AbsenceTrendPoint[];
  absenceTypes: AbsenceType[];
  departmentComparison: DepartmentComparison[];
  recentRequests: RecentRequest[];
}
interface ApiResponse<T> { isSuccess: boolean; data: T; message: string; }

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, DatePipe, DxChartModule, DxPieChartModule,
    DxDataGridModule, DxButtonModule, DxLoadIndicatorModule,
    DxToastModule, TranslateModule
  ],
  templateUrl: './admin-dahboard.html',
  styleUrls: ['./admin-dahboard.scss']
})
export class AdminDahboard implements OnInit {

  data: AdminDashboard | null = null;
  loading = true;
  toastVisible = false;
  toastMessage = '';


  chartPalette = ['#378ADD', '#1D9E75', '#EF9F27', '#D85A30', '#7F77DD'];
  periods = [
    { label: '1M', value: 1 },
    { label: '3M', value: 3 },
    { label: '6M', value: 6 }
  ];

  selectedPeriod = 6;

  get filteredAbsenceTrend() {
    return this.data?.absenceTrend?.slice(-this.selectedPeriod) ?? [];
  }

  onPeriodChange(months: number) {
    this.selectedPeriod = months;
  }
  private get statusMap(): Record<string, { label: string; cssClass: string }> {
    return {
      PendingTeamLead: { label: this.translate.instant('STATUS.PENDING_TEAMLEAD'), cssClass: 'badge-warn' },
      PendingAdministration: { label: this.translate.instant('STATUS.PENDING_ADMIN'), cssClass: 'badge-info' },
      Accepted: { label: this.translate.instant('STATUS.ACCEPTED'), cssClass: 'badge-ok' },
      RejectedTeamLead: { label: this.translate.instant('STATUS.REJECTED_TEAMLEAD'), cssClass: 'badge-danger' },
      RejectedAdministration: { label: this.translate.instant('STATUS.REJECTED_ADMIN'), cssClass: 'badge-danger' },
    };
  }

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.http.get<ApiResponse<AdminDashboard>>(`${environment.apiUrl}/dashboard/admin`)
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.data = res.data;
          } else {
            this.showToast(res.message || 'Erreur chargement dashboard.');
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.showToast('Erreur chargement dashboard.');
          this.cdr.detectChanges();
        }
      });
  }

  getStatusConfig(status: string) {
    return this.statusMap[status] ?? { label: status, cssClass: 'badge-info' };
  }

  onApprove(req: RecentRequest): void {
    this.showToast(`✓ ${req.employeeName}`);
  }

  onReject(req: RecentRequest): void {
    this.showToast(`✗ ${req.employeeName}`);
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    this.toastVisible = true;
  }
}