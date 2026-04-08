import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import { SharedService } from '../../../services/shared.service';
import { ToastType } from '../../../components/toast/toast';
import { ApiResponse } from '../../../models/auth/api-response.model';
import { SignalRService } from '../../../services/signalr.service';
import { DxDataGridModule, DxTemplateModule, DxPopupComponent, DxButtonComponent, DxLoadIndicatorModule, DxLoadPanelModule, DxCheckBoxComponent } from 'devextreme-angular';
import { DxCardViewComponent } from 'devextreme-angular';
import {
  DxiCardViewColumnComponent,
  DxoCardViewPagingComponent,
  DxoCardViewSearchPanelComponent,
  DxoCardViewPagerComponent
} from 'devextreme-angular/ui/card-view';
import DataSource from 'devextreme/data/data_source';
import CustomStore from 'devextreme/data/custom_store';
import { dxDataGridColumn } from 'devextreme/ui/data_grid';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-team-permissions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DxDataGridModule, DxCardViewComponent,
    DxiCardViewColumnComponent, DxoCardViewPagingComponent,
    DxoCardViewSearchPanelComponent, DxoCardViewPagerComponent,
    DxTemplateModule, DxPopupComponent, DxButtonComponent,
    DxLoadIndicatorModule, DxLoadPanelModule, DxCheckBoxComponent
  ],
  templateUrl: './team-permissions.html',
  styleUrls: ['./team-permissions.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TeamPermissions implements OnInit, OnDestroy {

  sharedDataSource!: DataSource;
  cardDataSource!: DataSource;
  pageSize = 10;

  isLoading = false;
  isProcessing = false;

  showApprovePopup = false;
  showRejectPopup = false;
  showReasonPopup = false;  // ✅
  selectedRequest: any = null;
  rejectionReason = '';     // ✅
  pendingOnly = false;

  private newRequestSub!: Subscription;

  columns: (string | dxDataGridColumn<any, any>)[] = [
    { dataField: 'employeeName', caption: 'Employee' },
    { dataField: 'reason', caption: 'Reason' },
    { dataField: 'startDate', caption: 'Date', dataType: 'date' as any, format: 'dd/MM/yyyy' },
    {
      caption: 'Time',
      calculateCellValue: (row: any) => {
        if (!row.startTime || !row.endTime) return '';
        return `${row.startTime.substring(0, 5)} - ${row.endTime.substring(0, 5)}`;
      }
    },
    {
      caption: 'Status',
      cellTemplate: (container: any, options: any) => {
        const span = document.createElement('span');
        const status = options.data.status;
        span.textContent = this.getStatusLabel(status);
        span.className = `badge ${this.getStatusClass(status)}`;
        container.append(span);
      }
    },
    {
      caption: 'Actions',
      minWidth: 220,
      cellTemplate: (container: any, options: any) => {
        const data = options.data;
        if (data.status !== 'PendingTeamLead') return;

        const approveBtn = document.createElement('button');
        approveBtn.className = 'action-btn approve-btn';
        approveBtn.innerHTML = '<i class="dx-icon dx-icon-check"></i> Approve';
        approveBtn.onclick = () => this.approveRequest(data);

        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'action-btn reject-btn';
        rejectBtn.innerHTML = '<i class="dx-icon dx-icon-close"></i> Reject';
        rejectBtn.onclick = () => this.rejectRequest(data);

        container.append(approveBtn, rejectBtn);
      }
    }
  ];

  getCardData = (rowData: any) => rowData;

  constructor(
    private http: HttpClient,
    private sharedService: SharedService,
    private cdr: ChangeDetectorRef,
    private signalRService: SignalRService
  ) {}

  ngOnInit(): void {
    this.initSharedDataSource();
    this.newRequestSub = this.signalRService.newRequestReceived$.subscribe(() => {
      this.sharedDataSource.reload();
      this.cardDataSource.reload();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.newRequestSub?.unsubscribe();
  }

  getHeaders() {
    return new HttpHeaders({
      Authorization: `Bearer ${this.sharedService.getToken()}`
    });
  }

  onFilterChange(): void {
    this.initSharedDataSource();
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PendingTeamLead': 'Pending Approval',
      'PendingAdministration': 'Pending Admin',
      'Accepted': 'Accepted',
      'RejectedTeamLead': 'Rejected',
      'RejectedAdministration': 'Rejected by Admin',
    };
    return labels[status] ?? status ?? '';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'PendingTeamLead': 'pending',
      'PendingAdministration': 'pending',
      'Accepted': 'approved',
      'RejectedTeamLead': 'rejected',
      'RejectedAdministration': 'rejected',
    };
    return classes[status] ?? '';
  }

  initSharedDataSource(): void {
    const storeConfig = {
      key: 'id',
      load: (loadOptions: any) => {
        const take = (loadOptions.take && loadOptions.take > 0)
          ? loadOptions.take : this.pageSize;
        const skip = loadOptions.skip ?? 0;
        const page = Math.floor(skip / take) + 1;

        let url = `${environment.apiUrl}/demande/team/permissions?page=${page}&pageSize=${take}`;
        if (this.pendingOnly) url += '&status=PendingTeamLead';

        return firstValueFrom(
          this.http.get<ApiResponse<any>>(url, { headers: this.getHeaders() })
        ).then(res => {
          if (res.isSuccess) {
            const data = res.data;
            return {
              data: Array.isArray(data) ? data : data.items ?? [],
              totalCount: Array.isArray(data) ? data.length : data.totalCount ?? 0
            };
          }
          return { data: [], totalCount: 0 };
        });
      }
    };

    this.sharedDataSource = new DataSource({
      onLoadingChanged: (isLoading) => {
        this.isLoading = isLoading;
        this.cdr.detectChanges();
      },
      store: new CustomStore(storeConfig),
      pageSize: this.pageSize,
      paginate: true,
      requireTotalCount: true
    });

    this.cardDataSource = new DataSource({
      store: new CustomStore(storeConfig),
      pageSize: this.pageSize,
      paginate: true,
      requireTotalCount: true
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
    this.showRejectPopup = true;  // ✅ Ouvre popup 1
    this.cdr.detectChanges();
  }

  // ✅ Popup 1 → ferme et ouvre popup 2
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
      `${environment.apiUrl}/demande/${this.selectedRequest.id}/approve`,
      {},
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.sharedService.showToastMessage(ToastType.Success, 'Permission approved');
          this.sharedDataSource.reload();
          this.cardDataSource.reload();
        } else {
          this.sharedService.showToastMessage(ToastType.Error, res.error || 'Approval failed');
        }
        this.showApprovePopup = false;
        this.selectedRequest = null;
        this.isProcessing = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isProcessing = false; this.cdr.detectChanges(); }
    });
  }

  // ✅ Popup 2 → envoie la requête
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
          this.sharedService.showToastMessage(ToastType.Success, 'Permission rejected');
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