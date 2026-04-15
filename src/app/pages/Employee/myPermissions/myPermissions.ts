import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import { SharedService } from '../../../services/shared.service';
import { ToastType } from '../../../components/toast/toast';
import { ApiResponse } from '../../../models/auth/api-response.model';
import { SignalRService } from '../../../services/signalr.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  DxDataGridModule, DxTemplateModule, DxPopupComponent, DxButtonComponent,
  DxTextBoxModule, DxDateBoxModule, DxLoadIndicatorModule, DxLoadPanelModule,
  DxValidatorModule, DxValidationGroupComponent
} from 'devextreme-angular';
import { DxCardViewComponent } from 'devextreme-angular';
import {
  DxiCardViewColumnComponent, DxoCardViewPagingComponent,
  DxoCardViewSearchPanelComponent, DxoCardViewPagerComponent
} from 'devextreme-angular/ui/card-view';
import DataSource from 'devextreme/data/data_source';
import CustomStore from 'devextreme/data/custom_store';
import { environment } from '../../../environments/environment';
import { CreatePermissionDto, PermissionDto } from '../../../models/auth/permission.model';

@Component({
  selector: 'app-my-permissions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DxDataGridModule, DxCardViewComponent,
    DxiCardViewColumnComponent, DxoCardViewPagingComponent,
    DxoCardViewSearchPanelComponent, DxoCardViewPagerComponent,
    DxTemplateModule, DxPopupComponent, DxButtonComponent,
    DxTextBoxModule, DxDateBoxModule, DxLoadIndicatorModule,
    DxLoadPanelModule, DxValidatorModule, DxValidationGroupComponent,
    TranslateModule
  ],
  templateUrl: './myPermissions.html',
  styleUrls: ['./myPermissions.scss'],
  encapsulation: ViewEncapsulation.None
})
export class MyPermissions implements OnInit, OnDestroy {

  @ViewChild('validationGroup') validationGroupRef: any;

  sharedDataSource!: DataSource;
  cardDataSource!: DataSource;
  pageSize = 10;
  columns: any[] = [];

  private statusSub!: Subscription;

  isLoading = false;
  isSaving = false;
  showPopup = false;

  permissionDate: Date | null = null;
  permissionStartTime: Date | null = null;
  permissionEndTime: Date | null = null;

  newPermission: CreatePermissionDto = {
    reason: '', startDate: '', startTime: '', endTime: ''
  };

  getCardData = (rowData: any) => rowData;

  constructor(
    private http: HttpClient,
    private sharedService: SharedService,
    private cdr: ChangeDetectorRef,
    private signalRService: SignalRService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.buildColumns();
    this.initSharedDataSource();
    this.translate.onLangChange.subscribe(() => {
      this.buildColumns();
      this.cdr.detectChanges();
    });
    this.statusSub = this.signalRService.requestStatusChanged$.subscribe(event => {
      if (event.type === 'Permission') {
        this.sharedDataSource.reload();
        this.cardDataSource.reload();
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
  }

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.sharedService.getToken()}` });
  }

  buildColumns(): void {
    this.columns = [
      { dataField: 'reason', caption: this.translate.instant('MY_PERMISSIONS.REASON') },
      { dataField: 'startDate', caption: this.translate.instant('MY_PERMISSIONS.DATE'), dataType: 'date' as any, format: 'dd/MM/yyyy' },
      {
        caption: this.translate.instant('MY_PERMISSIONS.TIME'),
        calculateCellValue: (row: PermissionDto) => {
          if (!row.startTime || !row.endTime) return '';
          return `${row.startTime.substring(0, 5)} - ${row.endTime.substring(0, 5)}`;
        }
      },
      {
        caption: this.translate.instant('MY_PERMISSIONS.STATUS'),
        cellTemplate: (container: any, options: any) => {
          const span = document.createElement('span');
          const status = options.data.status;
          span.textContent = this.getStatusLabel(status);
          span.className = `badge ${this.getStatusClass(status)}`;
          container.append(span);
        }
      }
    ];
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
        return firstValueFrom(
          this.http.get<ApiResponse<any>>(
            `${environment.apiUrl}/demande/my/permissions?page=${page}&pageSize=${take}`,
            { headers: this.getHeaders() }
          )
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

  onDateChanged(e: any): void {
    if (this.permissionDate) {
      const d = new Date(this.permissionDate);
      this.newPermission.startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }

  onStartTimeChanged(e: any): void {
    if (this.permissionStartTime) {
      const d = new Date(this.permissionStartTime);
      const h = d.getHours();
      const m = d.getMinutes();
      if (h < 8) {
        this.sharedService.showToastMessage(ToastType.Error, 'Start time cannot be before 08:00');
        this.permissionStartTime = null;
        this.newPermission.startTime = '';
        this.cdr.detectChanges();
        return;
      }
      if (h > 18 || (h === 18 && m > 0)) {
        this.sharedService.showToastMessage(ToastType.Error, 'Start time cannot be after 18:00');
        this.permissionStartTime = null;
        this.newPermission.startTime = '';
        this.cdr.detectChanges();
        return;
      }
      this.newPermission.startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    }
  }

  onEndTimeChanged(e: any): void {
    if (this.permissionEndTime) {
      const d = new Date(this.permissionEndTime);
      const h = d.getHours();
      const m = d.getMinutes();
      if (h < 8) {
        this.sharedService.showToastMessage(ToastType.Error, 'End time cannot be before 08:00');
        this.permissionEndTime = null;
        this.newPermission.endTime = '';
        this.cdr.detectChanges();
        return;
      }
      if (h > 18 || (h === 18 && m > 0)) {
        this.sharedService.showToastMessage(ToastType.Error, 'End time cannot be after 18:00');
        this.permissionEndTime = null;
        this.newPermission.endTime = '';
        this.cdr.detectChanges();
        return;
      }
      this.newPermission.endTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    }
  }

  openAdd(): void {
    this.permissionDate = null;
    this.permissionStartTime = null;
    this.permissionEndTime = null;
    this.newPermission = { reason: '', startDate: '', startTime: '', endTime: '' };
    this.showPopup = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.validationGroupRef?.instance?.reset(); }, 0);
  }

  save(validationGroup: any): void {
    const result = validationGroup.instance.validate();
    if (!result.isValid) {
      this.sharedService.showToastMessage(ToastType.Error, 'Please fill all required fields');
      return;
    }
    const date = new Date(this.newPermission.startDate);
    const day = date.getDay();
    if (day === 0 || day === 6) {
      this.sharedService.showToastMessage(ToastType.Error, 'Permissions cannot be on weekends');
      return;
    }
    if (this.newPermission.startTime >= this.newPermission.endTime) {
      this.sharedService.showToastMessage(ToastType.Error, 'Start time must be before end time');
      return;
    }
    if (this.isSaving) return;
    this.isSaving = true;
    this.cdr.detectChanges();
    this.http.post<ApiResponse<string>>(
      `${environment.apiUrl}/demande/permission`, this.newPermission, { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.sharedService.showToastMessage(ToastType.Success, 'Permission submitted successfully');
          this.showPopup = false;
          this.sharedDataSource.reload();
          this.cardDataSource.reload();
        } else {
          this.sharedService.showToastMessage(ToastType.Error, res.error || 'Failed');
        }
        this.isSaving = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isSaving = false; this.cdr.detectChanges(); }
    });
  }
}