import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DxChartModule, DxDataGridModule, DxButtonModule,
  DxLoadIndicatorModule, DxToastModule
} from 'devextreme-angular';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { Employeedashboard } from '../../Employee/employeedashboard/employeedashboard';
import { ApiResponse } from '../../../models/auth/api-response.model';

interface TeamLeadKpi {
  teamSize: number; presentToday: number; absentToday: number;
  pendingRequests: number; pendingAbsences: number; pendingPermissions: number;
}
interface AbsenceTrendPoint { month: string; count: number; }
interface MemberAbsence { memberName: string; absenceCount: number; }
interface TeamMemberStatus { fullName: string; isPresent: boolean; }
interface TeamRequest {
  id: number; employeeName: string; type: string;
  startDate: string; endDate: string; status: string;
}
interface TeamLeadDashboardData {
  kpi: TeamLeadKpi;
  absenceTrend: AbsenceTrendPoint[];
  memberAbsences: MemberAbsence[];
  teamMemberStatuses: TeamMemberStatus[];
  recentRequests: TeamRequest[];
}

@Component({
  selector: 'app-teamlead-dashboard',
  standalone: true,
  imports: [
    CommonModule, DxChartModule, DxDataGridModule, DxButtonModule,
    DxLoadIndicatorModule, DxToastModule, Employeedashboard, TranslateModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class TeamleadDashboardComponent implements OnInit {

  data: TeamLeadDashboardData | null = null;
  loading = true;
  currentView: 'me' | 'team' = 'team';
  toastVisible = false;
  toastMessage = '';
  chartPalette = ['#7F77DD', '#1D9E75', '#EF9F27', '#D85A30'];

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
    this.loadTeamDashboard();
  }

  private loadTeamDashboard(): void {
    this.http.get<ApiResponse<TeamLeadDashboardData>>(`${environment.apiUrl}/dashboard/teamlead`)
      .subscribe({
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

  switchView(view: 'me' | 'team'): void { this.currentView = view; }

  getStatusConfig(status: string) {
    return this.statusMap[status] ?? { label: status, cssClass: 'badge-info' };
  }

  onApprove(req: TeamRequest): void { this.showToast(`${req.employeeName}`); }
  onReject(req: TeamRequest): void { this.showToast(`${req.employeeName}`); }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    this.toastVisible = true;
  }
}