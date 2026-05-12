import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation, ViewChild, effect } from '@angular/core';
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
import { TeamAnalysis } from '../../../models/TeamAnalysis ';
import { DeepSeekService } from '../../../services/DeepSeekService';

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
  teamAnalyses: TeamAnalysis[] = [];

  private occupationMap = new Map<string, DayOccupation>();
  today: Date = new Date();
  private statusSub!: Subscription;
  private teamId = 0;

  geminiMessage = '';
  geminiLoading = false;
  alternatives: { startDate: string; endDate: string; reason: string }[] = [];
  loadingAlternatives = false;

  showWarningPopup = false;
  warningMessage = '';

  // ✅ Annulation de demande
  showCancelPopup = false;
  isCancelling = false;
  requestToCancel: any = null;

  isLoading = false;
  isSaving = false;
  showPopup = false;
  maxDaysAllowed = 0;
  requiresDocument = false;
  activeView: 'grid' | 'card' = 'grid';
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
    private calendarService: CalendarService,
    private deepSeekService: DeepSeekService
  ) {
    effect(() => {
      const view = this.sharedService.viewMode();
      if (window.innerWidth >= 1024) {
        this.activeView = view;
      }
    });
  }

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.teamId = user.teamId ?? user.teams?.[0]?.id ?? 0;

    this.applyView();
    window.addEventListener('resize', this.onResize);

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
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = (): void => { this.applyView(); }

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

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.sharedService.getToken()}` });
  }

  // ✅ Vérifier si la demande peut être annulée
  canCancel(status: string): boolean {
    return status === 'PendingTeamLead' || status === 'PendingAdministration';
  }

  // ✅ Ouvrir popup confirmation annulation
  cancelRequest(request: any): void {
    this.requestToCancel = request;
    this.showCancelPopup = true;
    this.cdr.detectChanges();
  }

  // ✅ Confirmer l'annulation — appel DELETE
  confirmCancel(): void {
    if (!this.requestToCancel || this.isCancelling) return;
    this.isCancelling = true;
    this.cdr.detectChanges();

    this.http.delete<ApiResponse<string>>(
      `${environment.apiUrl}/demande/${this.requestToCancel.id}/cancel`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.sharedService.showToastMessage(ToastType.Success, 'Demande annulée avec succès');
          this.sharedDataSource.reload();
          this.cardDataSource.reload();
        } else {
          this.sharedService.showToastMessage(ToastType.Error, res.error || 'Annulation échouée');
        }
        this.showCancelPopup = false;
        this.requestToCancel = null;
        this.isCancelling = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isCancelling = false;
        this.cdr.detectChanges();
      }
    });
  }

  private isLongueCategory(selected?: LeaveCategory): boolean {
    if (!selected) return false;
    return selected.name.toLowerCase().includes('longue') ||
      selected.name.toLowerCase().includes('long');
  }

  private isMaladieCategory(selected?: LeaveCategory): boolean {
    if (!selected) return false;
    return selected.name.toLowerCase().includes('maladie') ||
      selected.name.toLowerCase().includes('sick');
  }

  private computeRequiresDocument(selected?: LeaveCategory, numberOfDays?: number): boolean {
    const isLongue = this.isLongueCategory(selected);
    const isMaladie = this.isMaladieCategory(selected);
    return isLongue || (!!isMaladie && (numberOfDays ?? 0) > 3);
  }

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
      this.geminiMessage = '';
      this.geminiLoading = false;
      this.teamAnalyses = [];
      return;
    }

    this.geminiLoading = true;
    this.geminiMessage = '';
    this.teamAnalyses = [];
    this.alternatives = [];
    this.cdr.detectChanges();

    this.deepSeekService.getTeamAnalysis(
      this.newAbsence.startDate,
      this.newAbsence.endDate,
      0, 0, 0
    ).then(res => {
      this.teamAnalyses = res.analyses ?? [];
      if (this.teamAnalyses.length === 0) {
        this.geminiMessage = "📊 Vous êtes le seul membre de votre équipe — aucun impact.";
      }
      this.geminiLoading = false;
      this.cdr.detectChanges();
    }).catch(() => {
      this.geminiLoading = false;
      this.cdr.detectChanges();
    });
  }

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
      },
      // ✅ Colonne Actions avec bouton Annuler
      {
        caption: this.translate.instant('MY_ABSENCES.ACTIONS') || 'Actions',
        cellTemplate: (container: any, options: any) => {
          const data = options.data;
          if (!this.canCancel(data.status)) {
            const span = document.createElement('span');
            span.textContent = 'N/A';
            span.className = 'na-value';
            container.append(span);
            return;
          }
          const cancelBtn = document.createElement('button');
          cancelBtn.className = 'action-btn delete-btn';
          cancelBtn.innerHTML = `<i class="dx-icon dx-icon-close"></i> Annuler`;
          cancelBtn.onclick = () => this.cancelRequest(data);
          container.append(cancelBtn);
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
            this.cdr.detectChanges();
          }
        }
      });
  }

  loadBalance(): void {
    this.http.get<ApiResponse<LeaveBalanceDto[]>>(
      `${environment.apiUrl}/demande/my/balance`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.balances = res.data;
            this.cdr.detectChanges();
          }
        }
      });
  }

  onCategoryChange(): void {
    const selected = this.leaveCategories.find(c => c.id == this.newAbsence.leaveCategoryId);
    if (selected) {
      this.maxDaysAllowed = selected.maxDays || 0;
      this.requiresDocument = this.isLongueCategory(selected);
    } else {
      this.requiresDocument = false;
    }
    this.newAbsence.document = null;
    this.newAbsence.startDate = '';
    this.newAbsence.endDate = '';
    this.newAbsence.numberOfDays = 0;
    this.absenceDateRange = { startDate: null, endDate: null };
    this.geminiMessage = '';
    this.geminiLoading = false;
    this.teamAnalyses = [];
    this.alternatives = [];
    this.loadingAlternatives = false;
    this.cdr.detectChanges();
  }

  onDateRangeChanged(e: any): void {
    if (this.absenceDateRange.startDate && this.absenceDateRange.endDate) {
      const start = new Date(this.absenceDateRange.startDate);
      const end = new Date(this.absenceDateRange.endDate);
      this.newAbsence.startDate = this.toKey(start);
      this.newAbsence.endDate = this.toKey(end);

      const requests: Promise<void>[] = [];

      requests.push(new Promise<void>(resolve => {
        this.calendarService.getMonthOccupation(start.getFullYear(), start.getMonth() + 1).subscribe({
          next: (days) => {
            days.forEach(d => this.occupationMap.set(d.date.substring(0, 10), d));
            resolve();
          },
          error: () => resolve()
        });
      }));

      if (end.getMonth() !== start.getMonth()) {
        requests.push(new Promise<void>(resolve => {
          this.calendarService.getMonthOccupation(end.getFullYear(), end.getMonth() + 1).subscribe({
            next: (days) => {
              days.forEach(d => this.occupationMap.set(d.date.substring(0, 10), d));
              resolve();
            },
            error: () => resolve()
          });
        }));
      }

      Promise.all(requests).then(() => {
        this.calculateDays();
        this.computeOccupationBadge();
      });

    } else {
      this.geminiMessage = '';
      this.geminiLoading = false;
      this.teamAnalyses = [];
      this.alternatives = [];
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
      this.geminiMessage = '';
      this.teamAnalyses = [];
      this.alternatives = [];
      this.requiresDocument = false;
      this.cdr.detectChanges();
      return;
    }

    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (this.maxDaysAllowed > 0 && diff > this.maxDaysAllowed) {
      this.sharedService.showToastMessage(ToastType.Error, `Maximum ${this.maxDaysAllowed} days allowed`);
      this.newAbsence.endDate = '';
      this.newAbsence.numberOfDays = 0;
      this.absenceDateRange.endDate = null;
      this.geminiMessage = '';
      this.teamAnalyses = [];
      this.alternatives = [];
      this.requiresDocument = false;
      this.cdr.detectChanges();
      return;
    }

    this.newAbsence.numberOfDays = diff;
    const selected = this.leaveCategories.find(c => c.id == this.newAbsence.leaveCategoryId);
    this.requiresDocument = this.computeRequiresDocument(selected, diff);
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

    const selected = this.leaveCategories.find(c => c.id == this.newAbsence.leaveCategoryId);
    this.requiresDocument = this.computeRequiresDocument(selected, this.newAbsence.numberOfDays);

    this.teamAnalyses = [];
    this.alternatives = [];
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
    this.geminiMessage = '';
    this.geminiLoading = false;
    this.showWarningPopup = false;
    this.warningMessage = '';
    this.teamAnalyses = [];
    this.alternatives = [];
    this.loadingAlternatives = false;
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

  selectAlternative(alt: { startDate: string; endDate: string }): void {
    const start = new Date(alt.startDate);
    const end = new Date(alt.endDate);
    this.absenceDateRange = { startDate: start, endDate: end };
    this.newAbsence.startDate = this.toKey(start);
    this.newAbsence.endDate = this.toKey(end);
    this.newAbsence.numberOfDays = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const selected = this.leaveCategories.find(c => c.id == this.newAbsence.leaveCategoryId);
    this.requiresDocument = this.computeRequiresDocument(selected, this.newAbsence.numberOfDays);

    this.teamAnalyses = [];
    this.alternatives = [];
    this.computeOccupationBadge();
    this.cdr.detectChanges();
  }

  save(validationGroup: any): void {
    const result = validationGroup.instance.validate();
    if (!result.isValid) {
      this.sharedService.showToastMessage(ToastType.Error, 'Please fill all required fields');
      return;
    }

    if (this.requiresDocument && !this.newAbsence.document) {
      this.sharedService.showToastMessage(ToastType.Error,
        'Un document médical est obligatoire pour cette catégorie de congé');
      return;
    }

    const balance = this.balances.find(b => b.leaveCategoryId == this.newAbsence.leaveCategoryId);
    if (balance && this.maxDaysAllowed > 0 && this.newAbsence.numberOfDays > balance.remainingDays) {
      this.sharedService.showToastMessage(ToastType.Error,
        `Insufficient balance. You have ${balance.remainingDays} days remaining`);
      return;
    }

    const hasCritical = this.teamAnalyses.some(t => t.isCritical);

    if (hasCritical) {
      const criticalTeams = this.teamAnalyses
        .filter(t => t.isCritical)
        .map(t => t.teamName)
        .join(', ');
      this.warningMessage = `⚠️ Période critique pour : ${criticalTeams}. Voulez-vous continuer ?`;
      this.showWarningPopup = true;
      this.cdr.detectChanges();
      return;
    }

    this.submitAbsence();
  }

  confirmSubmit(): void {
    this.showWarningPopup = false;
    this.submitAbsence();
  }

  cancelWarning(): void {
    this.showWarningPopup = false;
    const criticalTeam = this.teamAnalyses.find(t => t.isCritical);
    if (criticalTeam && criticalTeam.alternatives.length > 0) {
      this.alternatives = criticalTeam.alternatives;
    }
    this.cdr.detectChanges();
  }

  get popupWidth(): number | string {
    return window.innerWidth <= 768 ? '95vw' : 500;
  }

  get popupMaxHeight(): number | string {
    return '90vh';
  }

  private submitAbsence(): void {
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
            this.sharedService.showToastMessage(ToastType.Error, res.error || res.message || 'Failed');
          }
          this.isSaving = false;
          this.cdr.detectChanges();
        },
        error: () => { this.isSaving = false; this.cdr.detectChanges(); }
      });
  }
}

