import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  DxChartModule, DxPieChartModule, DxDataGridModule,
  DxButtonModule, DxLoadIndicatorModule, DxToastModule
} from 'devextreme-angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

interface EmployeeKpi {
  remainingLeaves: number;
  usedLeaveDays: number;
  usedAbsences: number;
  usedPermissions: number;
  pendingRequests: number;
  pendingAbsences: number;
  pendingPermissions: number;
  todayDate: string;
  nextLeaveDate: string;
  nextLeaveType: string;
  nextLeaveDays: number;
  usedByCategory: { categoryName: string; usedDays: number }[];
  remainingByCategory: { categoryName: string; usedDays: number }[];
  pendingByCategory: { categoryName: string; usedDays: number }[];
}

interface AbsenceTrendPoint { month: string; count: number; }
interface AbsenceType { type: string; count: number; percentage: number; }

interface MyRequest {
  id: number; type: string;
  startDate: string; endDate: string; status: string;
}

interface EmployeeDashboard {
  kpi: EmployeeKpi;
  personalAbsenceTrend: AbsenceTrendPoint[];
  personalAbsenceTypes: AbsenceType[];
  myRequests: MyRequest[];
}

interface ApiResponse<T> { isSuccess: boolean; data: T; message: string; error?: string; }

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [
    CommonModule, DatePipe, DxChartModule, DxPieChartModule,
    DxDataGridModule, DxButtonModule, DxLoadIndicatorModule,
    DxToastModule, TranslateModule
  ],
  templateUrl: './employeedashboard.html',
  styleUrls: ['./employeedashboard.scss']
})
export class Employeedashboard implements OnInit {

  data: EmployeeDashboard | null = null;
  loading = true;
  toastVisible = false;
  toastMessage = '';
  chartPalette = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30'];
  cancellingId: number | null = null;

  private get statusMap(): Record<string, { label: string; cssClass: string }> {
    return {
      PendingTeamLead: { label: this.translate.instant('STATUS.PENDING_TEAMLEAD'), cssClass: 'badge-warn' },
      PendingAdministration: { label: this.translate.instant('STATUS.PENDING_ADMIN'), cssClass: 'badge-info' },
      Accepted: { label: this.translate.instant('STATUS.ACCEPTED'), cssClass: 'badge-ok' },
      RejectedTeamLead: { label: this.translate.instant('STATUS.REJECTED_TEAMLEAD'), cssClass: 'badge-danger' },
      RejectedAdministration: { label: this.translate.instant('STATUS.REJECTED_ADMIN'), cssClass: 'badge-danger' },
    };
  }

  periods = [
    { label: '1M', value: 1 },
    { label: '3M', value: 3 },
    { label: '6M', value: 6 }
  ];

  selectedPeriod = 6;

  get filteredAbsenceTrend() {
    return this.data?.personalAbsenceTrend?.slice(-this.selectedPeriod) ?? [];
  }

  onPeriodChange(months: number) {
    this.selectedPeriod = months;
  }

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadDashboard();
  }

  private getHeaders(): HttpHeaders {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = user.token || localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadDashboard(): void {
    this.loading = true;
    this.http.get<ApiResponse<EmployeeDashboard>>(
      `${environment.apiUrl}/dashboard/employee`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data) this.data = res.data;
        else this.showToast(res.message || 'Error');
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.showToast('Error');
        this.cdr.detectChanges();
      }
    });
  }

  getStatusConfig(status: string) {
    return this.statusMap[status] ?? { label: status, cssClass: 'badge-info' };
  }

  onCancel(req: MyRequest): void {
    if (!confirm(`Annuler la demande du ${req.startDate} ?`)) return;
    this.cancellingId = req.id;
    this.cdr.detectChanges();

    this.http.delete<any>(
      `${environment.apiUrl}/demande/${req.id}/cancel`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.showToast('Demande annulée avec succès');
          this.data!.myRequests = this.data!.myRequests.filter(r => r.id !== req.id);
          this.data!.kpi.pendingRequests = Math.max(0, this.data!.kpi.pendingRequests - 1);
        } else {
          this.showToast(res.error || 'Annulation impossible');
        }
        this.cancellingId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.showToast('Erreur lors de l\'annulation');
        this.cancellingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  customizePieTooltip(arg: any) {
    return { text: `${arg.argumentText}: ${arg.value} (${arg.percentText})` };
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    this.toastVisible = true;
    this.cdr.detectChanges();
  }
}