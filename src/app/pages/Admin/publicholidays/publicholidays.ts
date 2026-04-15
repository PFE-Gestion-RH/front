import { Component, OnInit, NgZone, ChangeDetectorRef, ViewEncapsulation, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SharedService } from '../../../services/shared.service';
import { ToastType } from '../../../components/toast/toast';
import { ApiResponse } from '../../../models/auth/api-response.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  DxDataGridModule, DxTemplateModule, DxPopupComponent, DxButtonComponent,
  DxLoadIndicatorModule, DxLoadPanelModule, DxDateBoxModule, DxSwitchModule,
  DxSelectBoxModule, DxTextBoxModule, DxValidatorModule, DxValidationGroupComponent
} from 'devextreme-angular';
import { DxCardViewComponent } from 'devextreme-angular';
import {
  DxiCardViewColumnComponent, DxoCardViewPagingComponent,
  DxoCardViewSearchPanelComponent, DxoCardViewPagerComponent
} from 'devextreme-angular/ui/card-view';
import DataSource from 'devextreme/data/data_source';
import CustomStore from 'devextreme/data/custom_store';
import { environment } from '../../../environments/environment';
import { CreatePublicHolidayForm, PublicHoliday } from '../../../models/Publicholidays.model';

@Component({
  selector: 'app-public-holidays',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DxDataGridModule, DxCardViewComponent,
    DxiCardViewColumnComponent, DxoCardViewPagingComponent,
    DxoCardViewSearchPanelComponent, DxoCardViewPagerComponent,
    DxTemplateModule, DxPopupComponent, DxButtonComponent,
    DxLoadIndicatorModule, DxLoadPanelModule, DxDateBoxModule,
    DxSwitchModule, DxSelectBoxModule, DxTextBoxModule,
    DxValidatorModule, DxValidationGroupComponent, TranslateModule
  ],
  templateUrl: './publicholidays.html',
  styleUrl: './publicholidays.scss',
  encapsulation: ViewEncapsulation.None
})
export class PublicHolidays implements OnInit {

  @ViewChild('validationGroup') validationGroupRef: any;

  sharedDataSource!: DataSource;
  pageSize = 10;
  columns: any[] = [];

  isLoading = false;
  isSaving = false;
  isDeleting = false;
  isSeeding = false;

  showPopup = false;
  isEditMode = false;
  showDeletePopup = false;
  holidayToDelete: PublicHoliday | null = null;
  form: CreatePublicHolidayForm = { name: '', nameAr: '', date: null as any, isRecurring: false };

  selectedYear: number = new Date().getFullYear();
  years: number[] = [];

  getCardData = (rowData: any) => rowData;

  constructor(
    private http: HttpClient,
    private sharedService: SharedService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);
    this.buildColumns();
    this.initSharedDataSource();
    this.translate.onLangChange.subscribe(() => {
      this.buildColumns();
      this.cdr.detectChanges();
    });
  }

  buildColumns(): void {
    this.columns = [
      { dataField: 'date', caption: this.translate.instant('PUBLIC_HOLIDAYS.DATE'), dataType: 'date', format: 'dd/MM/yyyy', width: 130 },
      { dataField: 'dayOfWeek', caption: this.translate.instant('PUBLIC_HOLIDAYS.DAY'), width: 100 },
      { dataField: 'name', caption: this.translate.instant('PUBLIC_HOLIDAYS.NAME') },
      { dataField: 'nameAr', caption: this.translate.instant('PUBLIC_HOLIDAYS.NAME_AR'), width: 150 },
      {
        dataField: 'isRecurring',
        caption: this.translate.instant('PUBLIC_HOLIDAYS.RECURRING'),
        width: 100,
        cellTemplate: (container: any, options: any) => {
          const badge = document.createElement('span');
          badge.className = options.data.isRecurring ? 'badge badge-recurring' : 'badge badge-once';
          badge.textContent = options.data.isRecurring
            ? this.translate.instant('PUBLIC_HOLIDAYS.YEARLY')
            : this.translate.instant('PUBLIC_HOLIDAYS.ONCE');
          container.append(badge);
        }
      },
      {
        dataField: 'isWeekend',
        caption: this.translate.instant('PUBLIC_HOLIDAYS.WEEKEND'),
        width: 100,
        cellTemplate: (container: any, options: any) => {
          if (options.data.isWeekend) {
            const badge = document.createElement('span');
            badge.className = 'badge badge-weekend';
            badge.textContent = this.translate.instant('PUBLIC_HOLIDAYS.WEEKEND');
            container.append(badge);
          }
        }
      },
      {
        caption: this.translate.instant('PUBLIC_HOLIDAYS.ACTIONS'),
        minWidth: 150,
        cellTemplate: (container: any, options: any) => {
          const data = options.data;

          const editBtn = document.createElement('button');
          editBtn.className = 'action-btn edit-btn';
          editBtn.innerHTML = `<i class="dx-icon dx-icon-edit"></i> ${this.translate.instant('PUBLIC_HOLIDAYS.EDIT')}`;
          editBtn.onclick = () => setTimeout(() => this.ngZone.run(() => {
            this.openEdit(data);
            this.cdr.detectChanges();
          }), 0);

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'action-btn delete-btn';
          deleteBtn.innerHTML = `<i class="dx-icon dx-icon-trash"></i> ${this.translate.instant('PUBLIC_HOLIDAYS.DELETE')}`;
          deleteBtn.onclick = () => this.ngZone.run(() => this.delete(data));

          container.append(editBtn, deleteBtn);
        }
      }
    ];
  }

  initSharedDataSource(): void {
    this.sharedDataSource = new DataSource({
      onLoadingChanged: (isLoading) => {
        this.isLoading = isLoading;
        this.cdr.detectChanges();
      },
      store: new CustomStore({
        key: 'id',
        load: () => {
          return firstValueFrom(
            this.http.get<ApiResponse<any>>(
              `${environment.apiUrl}/public-holidays?year=${this.selectedYear}`
            )
          ).then(res => {
            if (res.isSuccess) {
              const data = res.data;
              const items = Array.isArray(data) ? data : data.items ?? [];
              return { data: items, totalCount: items.length };
            }
            return { data: [], totalCount: 0 };
          });
        }
      }),
      pageSize: this.pageSize,
      paginate: true,
      requireTotalCount: true
    });
  }

  onYearChanged(): void { this.sharedDataSource.reload(); }

  openAdd(): void {
    this.isEditMode = false;
    this.form = { name: '', nameAr: '', date: null as any, isRecurring: false };
    this.showPopup = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.validationGroupRef?.instance?.reset(); }, 0);
  }

  openEdit(h: PublicHoliday): void {
    this.isEditMode = true;
    this.form = { id: h.id, name: h.name, nameAr: h.nameAr || '', date: h.date, isRecurring: h.isRecurring };
    this.showPopup = true;
    this.cdr.detectChanges();
  }

  save(validationGroup: any): void {
    const result = validationGroup.instance.validate();
    if (!result.isValid) {
      this.sharedService.showToastMessage(ToastType.Error, 'Please fill all required fields');
      return;
    }
    if (this.isSaving) return;
    this.isSaving = true;
    this.cdr.detectChanges();

    if (this.isEditMode && this.form.id) {
      this.http.put<ApiResponse<string>>(`${environment.apiUrl}/public-holidays/${this.form.id}`, this.form)
        .subscribe({
          next: (res) => {
            if (res.isSuccess) {
              this.sharedService.showToastMessage(ToastType.Success, 'Holiday updated');
              this.showPopup = false;
              this.sharedDataSource.reload();
            } else {
              this.sharedService.showToastMessage(ToastType.Error, res.error || 'Update failed');
            }
            this.isSaving = false;
            this.cdr.detectChanges();
          },
          error: () => { this.isSaving = false; this.cdr.detectChanges(); }
        });
    } else {
      this.http.post<ApiResponse<string>>(`${environment.apiUrl}/public-holidays`, this.form)
        .subscribe({
          next: (res) => {
            if (res.isSuccess) {
              this.sharedService.showToastMessage(ToastType.Success, 'Holiday created');
              this.showPopup = false;
              this.sharedDataSource.reload();
            } else {
              this.sharedService.showToastMessage(ToastType.Error, res.error || 'Create failed');
            }
            this.isSaving = false;
            this.cdr.detectChanges();
          },
          error: () => { this.isSaving = false; this.cdr.detectChanges(); }
        });
    }
  }

  delete(h: PublicHoliday): void {
    this.holidayToDelete = h;
    this.showDeletePopup = true;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.holidayToDelete || this.isDeleting) return;
    this.isDeleting = true;
    this.cdr.detectChanges();
    this.http.delete<ApiResponse<string>>(`${environment.apiUrl}/public-holidays/${this.holidayToDelete.id}`)
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.sharedService.showToastMessage(ToastType.Success, 'Holiday deleted');
            this.sharedDataSource.reload();
          } else {
            this.sharedService.showToastMessage(ToastType.Error, res.error || 'Delete failed');
          }
          this.showDeletePopup = false;
          this.holidayToDelete = null;
          this.isDeleting = false;
          this.cdr.detectChanges();
        },
        error: () => { this.isDeleting = false; this.cdr.detectChanges(); }
      });
  }

  seedHolidays(): void {
    if (this.isSeeding) return;
    this.isSeeding = true;
    this.cdr.detectChanges();
    this.http.post<ApiResponse<string>>(`${environment.apiUrl}/public-holidays/seed/${this.selectedYear}`, {})
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.sharedService.showToastMessage(ToastType.Success, `Tunisia holidays seeded for ${this.selectedYear}`);
            this.sharedDataSource.reload();
          } else {
            this.sharedService.showToastMessage(ToastType.Error, res.error || 'Seed failed');
          }
          this.isSeeding = false;
          this.cdr.detectChanges();
        },
        error: () => { this.isSeeding = false; this.cdr.detectChanges(); }
      });
  }
}