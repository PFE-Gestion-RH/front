import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation, effect } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import { SharedService } from '../../../services/shared.service';
import { ToastType } from '../../../components/toast/toast';
import { ApiResponse } from '../../../models/auth/api-response.model';
import { SignalRService } from '../../../services/signalr.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DxDataGridModule, DxTemplateModule, DxPopupComponent, DxButtonComponent, DxLoadIndicatorModule, DxLoadPanelModule, DxCheckBoxComponent, DxTooltipComponent } from 'devextreme-angular';
import { DxCardViewComponent } from 'devextreme-angular';
import {
  DxiCardViewColumnComponent, DxoCardViewPagingComponent,
  DxoCardViewSearchPanelComponent, DxoCardViewPagerComponent
} from 'devextreme-angular/ui/card-view';
import DataSource from 'devextreme/data/data_source';
import CustomStore from 'devextreme/data/custom_store';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-team-absences',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DxDataGridModule, DxCardViewComponent,
    DxiCardViewColumnComponent, DxoCardViewPagingComponent,
    DxoCardViewSearchPanelComponent, DxoCardViewPagerComponent,
    DxTemplateModule, DxPopupComponent, DxButtonComponent,
    DxLoadIndicatorModule, DxLoadPanelModule, DxCheckBoxComponent,
    TranslateModule,
    DxTooltipComponent
  ],
  templateUrl: './team-absences.html',
  styleUrls: ['./team-absences.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TeamAbsences implements OnInit, OnDestroy {

  sharedDataSource!: DataSource;
  cardDataSource!: DataSource;
  pageSize = 10;
  columns: any[] = [];
  activeView: 'grid' | 'card' = 'grid';
  isLoading = false;
  isProcessing = false;

  showApprovePopup = false;
  showRejectPopup = false;
  showReasonPopup = false;
  showSimulatePopup = false;
  showMultiSimulatePopup = false;
  selectedRequest: any = null;
  rejectionReason = '';
  pendingOnly = false;

  // Simulation simple
  simulationResult: any = null;
  isSimulating = false;

  // Simulation multi
  multiSimulationResult: any = null;
  isMultiSimulating = false;
  selectedIds: Set<number> = new Set();

  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  tooltipData: any = null;

  private newRequestSub!: Subscription;
  getCardData = (rowData: any) => rowData;

  constructor(
    private http: HttpClient,
    private sharedService: SharedService,
    private cdr: ChangeDetectorRef,
    private signalRService: SignalRService,
    private translate: TranslateService
  ) {
    effect(() => {
      const view = this.sharedService.viewMode();
      if (window.innerWidth >= 1024) {
        this.activeView = view;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    this.applyView();
    window.addEventListener('resize', this.onResize);
    this.buildColumns();
    this.initSharedDataSource();
    this.translate.onLangChange.subscribe(() => {
      this.buildColumns();
      this.cdr.detectChanges();
    });
    this.newRequestSub = this.signalRService.newRequestReceived$.subscribe(() => {
      this.sharedDataSource.reload();
      this.cardDataSource.reload();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.newRequestSub?.unsubscribe();
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.applyView();
  }

  private applyView(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || user.email || 'default';
    if (window.innerWidth < 1024) {
      this.activeView = 'card';
    } else {
      const saved = (localStorage.getItem(`view_${userId}`) as 'grid' | 'card') || 'grid';
      this.activeView = saved;
      this.sharedService.viewMode.set(saved);
    }
    this.cdr.detectChanges();
  }

  // ── Checkbox sélection ────────────────────────────────────────────────────
  toggleSelection(id: number): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.cdr.detectChanges();
  }

  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  // ── Simulation multi ──────────────────────────────────────────────────────
  simulateSelected(): void {
    if (this.selectedIds.size < 2) {
      this.sharedService.showToastMessage(ToastType.Error, 'Sélectionnez au moins 2 demandes');
      return;
    }

    this.multiSimulationResult = null;
    this.isMultiSimulating = true;
    this.showMultiSimulatePopup = true;
    this.cdr.detectChanges();

    this.http.post<ApiResponse<any>>(
      `${environment.apiUrl}/demande/simulate-multi`,
      { requestIds: Array.from(this.selectedIds) },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.multiSimulationResult = res.data;
        } else {
          this.sharedService.showToastMessage(ToastType.Error, res.error || 'Failed');
          this.showMultiSimulatePopup = false;
        }
        this.isMultiSimulating = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isMultiSimulating = false;
        this.showMultiSimulatePopup = false;
        this.cdr.detectChanges();
      }
    });
  }

  showTooltip(event: MouseEvent, data: any): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.tooltipData = data;
    this.tooltipX = rect.left + rect.width / 2 - 90;
    this.tooltipY = rect.top - 70;
    this.tooltipVisible = true;
    this.cdr.detectChanges();
  }

  hideTooltip(): void {
    this.tooltipVisible = false;
    this.cdr.detectChanges();
  }

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.sharedService.getToken()}` });
  }

  buildColumns(): void {
    this.columns = [
      {
        caption: '',
        width: 40,
        cellTemplate: (container: any, options: any) => {
          const data = options.data;
          if (data.status !== 'PendingTeamLead') return;

          const wrapper = document.createElement('div');
          wrapper.style.display = 'flex';
          wrapper.style.justifyContent = 'center';
          wrapper.style.alignItems = 'center';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = this.isSelected(data.id);
          checkbox.style.cssText = 'width:16px; height:16px; cursor:pointer; accent-color:#3B8AB2;';
          checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.toggleSelection(data.id);
            this.cdr.detectChanges();
          });

          wrapper.appendChild(checkbox);
          container.appendChild(wrapper);
        }
      },
      {
        caption: this.translate.instant('TEAM_ABSENCES.EMPLOYEE'),
        dataField: 'employeeName',
        cellTemplate: 'employeeTooltipTemplate'
      },
      { dataField: 'leaveCategoryName', caption: this.translate.instant('TEAM_ABSENCES.LEAVE_TYPE') },
      { dataField: 'startDate', caption: this.translate.instant('TEAM_ABSENCES.START_DATE'), dataType: 'date' as any, format: 'dd/MM/yyyy' },
      { dataField: 'endDate', caption: this.translate.instant('TEAM_ABSENCES.END_DATE'), dataType: 'date' as any, format: 'dd/MM/yyyy' },
      { dataField: 'numberOfDays', caption: this.translate.instant('TEAM_ABSENCES.DAYS') },
      {
        caption: this.translate.instant('TEAM_ABSENCES.STATUS'),
        cellTemplate: (container: any, options: any) => {
          const span = document.createElement('span');
          const status = options.data.status;
          span.textContent = this.getStatusLabel(status);
          span.className = `badge ${this.getStatusClass(status)}`;
          container.append(span);
        }
      },
      {
        caption: this.translate.instant('TEAM_ABSENCES.ACTIONS'),
        minWidth: 320,
        cellTemplate: (container: any, options: any) => {
          const data = options.data;

          if (data.status !== 'PendingTeamLead') {
            const span = document.createElement('span');
            span.textContent = 'N/A';
            span.className = 'na-value';
            container.append(span);
            return;
          }

          const simulateBtn = document.createElement('button');
          simulateBtn.className = 'action-btn simulate-btn';
          simulateBtn.innerHTML = `<i class="dx-icon dx-icon-chart"></i> ${this.translate.instant('TEAM_ABSENCES.SIMULATE')}`;
          simulateBtn.onclick = () => this.simulateRequest(data);

          const approveBtn = document.createElement('button');
          approveBtn.className = 'action-btn approve-btn';
          approveBtn.innerHTML = `<i class="dx-icon dx-icon-check"></i> ${this.translate.instant('TEAM_ABSENCES.APPROVE')}`;
          approveBtn.onclick = () => this.approveRequest(data);

          const rejectBtn = document.createElement('button');
          rejectBtn.className = 'action-btn reject-btn';
          rejectBtn.innerHTML = `<i class="dx-icon dx-icon-close"></i> ${this.translate.instant('TEAM_ABSENCES.REJECT')}`;
          rejectBtn.onclick = () => this.rejectRequest(data);

          container.append(simulateBtn, approveBtn, rejectBtn);
        }
      }
    ];
  }

  onFilterChange(): void {
    this.selectedIds.clear();
    this.initSharedDataSource();
  }
  get maxRate(): number {
    if (!this.multiSimulationResult?.dailyImpacts?.length) return 0;
    return Math.max(...this.multiSimulationResult.dailyImpacts.map((d: any) => d.rate));
  }

  get criticalDays(): number {
    if (!this.multiSimulationResult?.dailyImpacts?.length) return 0;
    return this.multiSimulationResult.dailyImpacts.filter((d: any) => d.color === 'red').length;
  }

  get totalDays(): number {
    return this.multiSimulationResult?.dailyImpacts?.length ?? 0;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PendingTeamLead': this.translate.instant('STATUS.PENDING_TEAMLEAD'),
      'PendingAdministration': this.translate.instant('STATUS.PENDING_ADMIN'),
      'Accepted': this.translate.instant('STATUS.ACCEPTED'),
      'RejectedTeamLead': this.translate.instant('STATUS.REJECTED_TEAMLEAD'),
      'RejectedAdministration': this.translate.instant('STATUS.REJECTED_ADMIN'),
    };
    return labels[status] ?? status ?? '';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'PendingTeamLead': 'pending', 'PendingAdministration': 'pending',
      'Accepted': 'approved', 'RejectedTeamLead': 'rejected', 'RejectedAdministration': 'rejected',
    };
    return classes[status] ?? '';
  }

  initSharedDataSource(): void {
    const storeConfig = {
      key: 'id',
      load: (loadOptions: any) => {
        const take = (loadOptions.take && loadOptions.take > 0) ? loadOptions.take : this.pageSize;
        const skip = loadOptions.skip ?? 0;
        const page = Math.floor(skip / take) + 1;
        let url = `${environment.apiUrl}/demande/team/absences?page=${page}&pageSize=${take}`;
        if (this.pendingOnly) url += '&status=PendingTeamLead';
        return firstValueFrom(
          this.http.get<ApiResponse<any>>(url, { headers: this.getHeaders() })
        ).then(res => {
          if (res.isSuccess) {
            const data = res.data;
            return { data: Array.isArray(data) ? data : data.items ?? [], totalCount: Array.isArray(data) ? data.length : data.totalCount ?? 0 };
          }
          return { data: [], totalCount: 0 };
        });
      }
    };

    this.sharedDataSource = new DataSource({
      onLoadingChanged: (isLoading) => { this.isLoading = isLoading; this.cdr.detectChanges(); },
      store: new CustomStore(storeConfig),
      pageSize: this.pageSize, paginate: true, requireTotalCount: true
    });

    this.cardDataSource = new DataSource({
      store: new CustomStore(storeConfig),
      pageSize: this.pageSize, paginate: true, requireTotalCount: true
    });
  }

  // ── Simulation simple ─────────────────────────────────────────────────────
  simulateRequest(request: any): void {
    this.selectedRequest = request;
    this.simulationResult = null;
    this.isSimulating = true;
    this.showSimulatePopup = true;
    this.cdr.detectChanges();

    this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/demande/${request.id}/simulate`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.simulationResult = res.data;
        } else {
          this.sharedService.showToastMessage(ToastType.Error, res.error || 'Simulation failed');
          this.showSimulatePopup = false;
        }
        this.isSimulating = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSimulating = false;
        this.showSimulatePopup = false;
        this.cdr.detectChanges();
      }
    });
  }

  approveRequest(request: any): void {
    this.selectedRequest = request;
    this.showApprovePopup = true;
    this.cdr.detectChanges();
  }

  rejectRequest(request: any): void {
    this.selectedRequest = request;
    this.rejectionReason = '';
    this.showRejectPopup = true;
    this.cdr.detectChanges();
  }

  openReasonPopup(): void {
    this.showRejectPopup = false;
    this.showReasonPopup = true;
    this.cdr.detectChanges();
  }

  confirmApprove(): void {
    if (!this.selectedRequest || this.isProcessing) return;
    this.isProcessing = true;
    this.cdr.detectChanges();
    this.http.patch<ApiResponse<string>>(
      `${environment.apiUrl}/demande/${this.selectedRequest.id}/approve`, {},
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.sharedService.showToastMessage(ToastType.Success, 'Request approved');
          this.selectedIds.delete(this.selectedRequest.id);
          this.sharedDataSource.reload();
          this.cardDataSource.reload();
        } else {
          this.sharedService.showToastMessage(ToastType.Error, res.error || 'Approval failed');
        }
        this.showApprovePopup = false;
        this.showSimulatePopup = false;
        this.selectedRequest = null;
        this.isProcessing = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isProcessing = false; this.cdr.detectChanges(); }
    });
  }

  confirmReject(): void {
    if (!this.selectedRequest || this.isProcessing) return;
    this.isProcessing = true;
    this.cdr.detectChanges();
    this.http.patch<ApiResponse<string>>(
      `${environment.apiUrl}/demande/${this.selectedRequest.id}/reject`,
      { rejectionReason: this.rejectionReason },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.sharedService.showToastMessage(ToastType.Success, 'Request rejected');
          this.selectedIds.delete(this.selectedRequest.id);
          this.sharedDataSource.reload();
          this.cardDataSource.reload();
        } else {
          this.sharedService.showToastMessage(ToastType.Error, res.error || 'Rejection failed');
        }
        this.showReasonPopup = false;
        this.selectedRequest = null;
        this.rejectionReason = '';
        this.isProcessing = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isProcessing = false; this.cdr.detectChanges(); }
    });
  }
}