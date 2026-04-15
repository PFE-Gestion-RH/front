import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import { SharedService } from '../../../services/shared.service';
import { ToastType } from '../../../components/toast/toast';
import { ApiResponse } from '../../../models/auth/api-response.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  DxDataGridModule, DxTemplateModule, DxPopupComponent, DxButtonComponent,
  DxFileUploaderModule, DxSelectBoxModule, DxNumberBoxModule, DxDateRangeBoxModule,
  DxTextBoxModule, DxLoadIndicatorModule, DxLoadPanelModule, DxValidatorModule,
  DxValidationGroupComponent
} from 'devextreme-angular';
import { DxCardViewComponent } from 'devextreme-angular';
import { SignalRService } from '../../../services/signalr.service';
import {
  DxiCardViewColumnComponent, DxoCardViewPagingComponent,
  DxoCardViewSearchPanelComponent, DxoCardViewPagerComponent
} from 'devextreme-angular/ui/card-view';
import DataSource from 'devextreme/data/data_source';
import CustomStore from 'devextreme/data/custom_store';
import { CreateAbsenceDto, LeaveBalanceDto } from '../../../models/absence.model';
import { LeaveCategory } from '../../../models/leave-category.model';
import { environment } from '../../../environments/environment';
import { CalendarService } from '../../../services/calendar.service';
import { DayOccupation } from '../../../models/calendar.model';

@Component({
  selector: 'app-my-absences',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DxDataGridModule, DxCardViewComponent,
    DxiCardViewColumnComponent, DxoCardViewPagingComponent,
    DxoCardViewSearchPanelComponent, DxoCardViewPagerComponent,
    DxTemplateModule, DxPopupComponent, DxButtonComponent,
    DxFileUploaderModule, DxSelectBoxModule, DxDateRangeBoxModule,
    DxNumberBoxModule, DxTextBoxModule, DxLoadIndicatorModule,
    DxLoadPanelModule, DxValidatorModule, DxValidationGroupComponent,
    TranslateModule
  ],
  templateUrl: './myAbsences.html',
  styleUrls: ['./myAbsences.scss'],
  encapsulation: ViewEncapsulation.None
})
export class MyAbsences implements OnInit, OnDestroy {

  @ViewChild('validationGroup') validationGroupRef: any;

  sharedDataSource!: DataSource;
  cardDataSource!: DataSource;
  leaveCategories: LeaveCategory[] = [];
  balances: LeaveBalanceDto[] = [];
  pageSize = 10;
  columns: any[] = [];
  occupationBadge: { color: string; message: string } | null = null;
  private occupationMap = new Map<string, DayOccupation>();

  private statusSub!: Subscription;

  isLoading = false;
  isSaving = false;
  showPopup = false;
  maxDaysAllowed = 0;
  requiresDocument = false;

  absenceDateRange: { startDate: Date | null; endDate: Date | null } = {
    startDate: null, endDate: null
  };

  newAbsence: CreateAbsenceDto = {
    startDate: '', endDate: '', numberOfDays: null as any,
    leaveCategoryId: null as any, document: null, notes: ''
  };

  getCardData = (rowData: any) => rowData;

  constructor(
    private http: HttpClient,
    private sharedService: SharedService,
    private cdr: ChangeDetectorRef,
    private signalRService: SignalRService,
    private translate: TranslateService,
    private calendarService: CalendarService
  ) { }

  ngOnInit(): void {
    this.buildColumns();
    this.initSharedDataSource();
    this.loadLeaveCategories();
    this.loadCalendarOccupation();
    this.translate.onLangChange.subscribe(() => {
      this.buildColumns();
      this.cdr.detectChanges();
    });
    this.statusSub = this.signalRService.requestStatusChanged$.subscribe(event => {
      if (event.type === 'Absence') {
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

  // ── Calendar Occupation ───────────────────────────────────────────────────
  loadCalendarOccupation(year?: number, month?: number): void {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;
    this.calendarService.getMonthOccupation(y, m).subscribe({
      next: (days) => {
        days.forEach(d => this.occupationMap.set(d.date.substring(0, 10), d));
        this.cdr.detectChanges();
      }
    });
  }

  private toKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  computeOccupationBadge(): void {
    if (!this.absenceDateRange.startDate || !this.absenceDateRange.endDate) {
      this.occupationBadge = null;
      return;
    }

    const start = new Date(this.absenceDateRange.startDate);
    const end = new Date(this.absenceDateRange.endDate);

    let totalRate = 0;
    let maxAbsent = 0;
    let count = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = this.toKey(new Date(d));
      const day = this.occupationMap.get(key);
      if (day) {
        totalRate += day.occupationRate;
        maxAbsent = Math.max(maxAbsent, day.absentCount);
        count++;
      }
    }

    // Charge les mois manquants si la plage dépasse le mois courant
    if (count === 0) {
      this.loadCalendarOccupation(start.getFullYear(), start.getMonth() + 1);
      if (end.getMonth() !== start.getMonth()) {
        this.loadCalendarOccupation(end.getFullYear(), end.getMonth() + 1);
      }
    }

    const avgRate = count > 0 ? totalRate / count : 0;

    if (avgRate === 0) {
      this.occupationBadge = {
        color: 'badge-green',
        message: `✅ Disponible — ${maxAbsent} absent(s) sur cette période`
      };
    } else if (avgRate < 0.30) {
      this.occupationBadge = {
        color: 'badge-green',
        message: `✅ Peu chargé — ${maxAbsent} absent(s) sur cette période`
      };
    } else if (avgRate < 0.50) {
      this.occupationBadge = {
        color: 'badge-orange',
        message: `⚠️ Modérément chargé — ${maxAbsent} absent(s) sur cette période`
      };
    } else {
      this.occupationBadge = {
        color: 'badge-red',
        message: `🔴 Période chargée — ${maxAbsent} absent(s) sur cette période`
      };
    }

    this.cdr.detectChanges();
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  buildColumns(): void {
    this.columns = [
      { dataField: 'leaveCategoryName', caption: this.translate.instant('MY_ABSENCES.LEAVE_TYPE') },
      { dataField: 'startDate', caption: this.translate.instant('MY_ABSENCES.START_DATE'), dataType: 'date' as any, format: 'dd/MM/yyyy' },
      { dataField: 'endDate', caption: this.translate.instant('MY_ABSENCES.END_DATE'), dataType: 'date' as any, format: 'dd/MM/yyyy' },
      { dataField: 'numberOfDays', caption: this.translate.instant('MY_ABSENCES.DAYS') },
      {
        caption: this.translate.instant('MY_ABSENCES.STATUS'),
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

  // ── DataSource ────────────────────────────────────────────────────────────
  initSharedDataSource(): void {
    const storeConfig = {
      key: 'id',
      load: (loadOptions: any) => {
        const take = (loadOptions.take && loadOptions.take > 0) ? loadOptions.take : this.pageSize;
        const skip = loadOptions.skip ?? 0;
        const page = Math.floor(skip / take) + 1;
        return firstValueFrom(
          this.http.get<ApiResponse<any>>(
            `${environment.apiUrl}/demande/my/absences?page=${page}&pageSize=${take}`,
            { headers: this.getHeaders() }
          )
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
      onLoadingChanged: (isLoading) => { this.isLoading = isLoading; this.cdr.detectChanges(); },
      store: new CustomStore(storeConfig),
      pageSize: this.pageSize, paginate: true, requireTotalCount: true
    });

    this.cardDataSource = new DataSource({
      store: new CustomStore(storeConfig),
      pageSize: this.pageSize, paginate: true, requireTotalCount: true
    });
  }

  loadLeaveCategories(): void {
    this.http.get<ApiResponse<LeaveCategory[]>>(
      `${environment.apiUrl}/leave-categories`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.leaveCategories = Array.isArray(res.data) ? res.data : (res.data as any).items ?? [];
          }
        }
      });
  }

  loadBalance(): void {
    this.http.get<ApiResponse<LeaveBalanceDto[]>>(
      `${environment.apiUrl}/demande/my/balance`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => { if (res.isSuccess && res.data) this.balances = res.data; }
      });
  }

  onCategoryChange(): void {
    const selected = this.leaveCategories.find(c => c.id == this.newAbsence.leaveCategoryId);
    if (selected) {
      this.maxDaysAllowed = selected.maxDays || 0;
      this.requiresDocument = selected.name.toLowerCase().includes('sick') ||
        selected.name.toLowerCase().includes('maladie');
    }
    this.newAbsence.document = null;
    this.newAbsence.startDate = '';
    this.newAbsence.endDate = '';
    this.newAbsence.numberOfDays = 0;
    this.absenceDateRange = { startDate: null, endDate: null };
    this.occupationBadge = null;
    this.cdr.detectChanges();
  }

  onDateRangeChanged(e: any): void {
    if (this.absenceDateRange.startDate && this.absenceDateRange.endDate) {
      const start = new Date(this.absenceDateRange.startDate);
      const end = new Date(this.absenceDateRange.endDate);
      this.newAbsence.startDate = this.toKey(start);
      this.newAbsence.endDate = this.toKey(end);

      // Charge les mois si nécessaire
      this.loadCalendarOccupation(start.getFullYear(), start.getMonth() + 1);
      if (end.getMonth() !== start.getMonth()) {
        this.loadCalendarOccupation(end.getFullYear(), end.getMonth() + 1);
      }

      this.calculateDays();
      this.computeOccupationBadge();
    } else {
      this.occupationBadge = null;
    }
  }

  calculateDays(): void {
    if (!this.newAbsence.startDate || !this.newAbsence.endDate) return;
    const [sy, sm, sd] = this.newAbsence.startDate.split('-').map(Number);
    const [ey, em, ed] = this.newAbsence.endDate.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    if (end < start) {
      this.sharedService.showToastMessage(ToastType.Error, 'End date must be after start date');
      this.newAbsence.endDate = '';
      this.newAbsence.numberOfDays = 0;
      this.absenceDateRange.endDate = null;
      this.occupationBadge = null;
      this.cdr.detectChanges();
      return;
    }
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (this.maxDaysAllowed > 0 && diff > this.maxDaysAllowed) {
      this.sharedService.showToastMessage(ToastType.Error, `Maximum ${this.maxDaysAllowed} days allowed`);
      this.newAbsence.endDate = '';
      this.newAbsence.numberOfDays = 0;
      this.absenceDateRange.endDate = null;
      this.occupationBadge = null;
      this.cdr.detectChanges();
      return;
    }
    this.newAbsence.numberOfDays = diff;
    this.cdr.detectChanges();
  }

  onDaysChange(): void {
    if (!this.newAbsence.startDate || !this.newAbsence.numberOfDays) return;
    if (this.maxDaysAllowed > 0 && this.newAbsence.numberOfDays > this.maxDaysAllowed) {
      this.sharedService.showToastMessage(ToastType.Error, `Maximum ${this.maxDaysAllowed} days allowed`);
      this.newAbsence.numberOfDays = this.maxDaysAllowed;
    }
    const start = new Date(this.newAbsence.startDate);
    start.setDate(start.getDate() + this.newAbsence.numberOfDays - 1);
    this.newAbsence.endDate = start.toISOString().split('T')[0];
    this.absenceDateRange.endDate = new Date(this.newAbsence.endDate);
    this.computeOccupationBadge();
    this.cdr.detectChanges();
  }

  openAdd(): void {
    this.absenceDateRange = { startDate: null, endDate: null };
    this.newAbsence = {
      startDate: '', endDate: '', numberOfDays: null as any,
      leaveCategoryId: null as any, document: null, notes: ''
    };
    this.maxDaysAllowed = 0;
    this.requiresDocument = false;
    this.occupationBadge = null;
    this.occupationMap.clear();
    this.loadBalance();
    this.loadCalendarOccupation();
    this.showPopup = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.validationGroupRef?.instance?.reset(); }, 0);
  }

  onFileSelected(event: any): void {
    const file = event.value[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.newAbsence.document = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  save(validationGroup: any): void {
    const result = validationGroup.instance.validate();
    if (!result.isValid) {
      this.sharedService.showToastMessage(ToastType.Error, 'Please fill all required fields');
      return;
    }
    const balance = this.balances.find(b => b.leaveCategoryId == this.newAbsence.leaveCategoryId);
    if (balance && this.maxDaysAllowed > 0 && this.newAbsence.numberOfDays > balance.remainingDays) {
      this.sharedService.showToastMessage(ToastType.Error,
        `Insufficient balance. You have ${balance.remainingDays} days remaining`);
      return;
    }
    if (this.isSaving) return;
    this.isSaving = true;
    this.cdr.detectChanges();
    this.http.post<ApiResponse<string>>(
      `${environment.apiUrl}/demande/absence`, this.newAbsence, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.sharedService.showToastMessage(ToastType.Success, 'Absence declared successfully');
            this.showPopup = false;
            this.sharedDataSource.reload();
            this.cardDataSource.reload();
            this.loadBalance();
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