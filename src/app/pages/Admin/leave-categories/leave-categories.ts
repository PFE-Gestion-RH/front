import { Component, OnInit, OnDestroy, NgZone, effect, ChangeDetectorRef, ViewEncapsulation, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SharedService } from '../../../services/shared.service';
import { ToastType } from '../../../components/toast/toast';
import { ApiResponse } from '../../../models/auth/api-response.model';
import { LeaveCategory, CreateLeaveCategoryForm } from '../../../models/leave-category.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  DxDataGridModule, DxTemplateModule, DxPopupComponent, DxButtonComponent,
  DxLoadIndicatorModule, DxLoadPanelModule, DxTextBoxModule, DxNumberBoxModule,
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

@Component({
  selector: 'app-leave-categories',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DxDataGridModule, DxCardViewComponent,
    DxiCardViewColumnComponent, DxoCardViewPagingComponent,
    DxoCardViewSearchPanelComponent, DxoCardViewPagerComponent,
    DxTemplateModule, DxPopupComponent, DxButtonComponent,
    DxLoadIndicatorModule, DxLoadPanelModule, DxTextBoxModule,
    DxNumberBoxModule, DxValidatorModule, DxValidationGroupComponent,
    TranslateModule
  ],
  templateUrl: './leave-categories.html',
  styleUrl: './leave-categories.scss',
  encapsulation: ViewEncapsulation.None
})
export class LeaveCategories implements OnInit, OnDestroy {

  @ViewChild('validationGroup') validationGroupRef: any;

  sharedDataSource!: DataSource;
  pageSize = 10;
  columns: any[] = [];
  activeView: 'grid' | 'card' = 'grid';
  isLoading = false;
  isSaving = false;
  isDeleting = false;

  showPopup = false;
  isEditMode = false;
  showDeletePopup = false;
  categoryToDelete: LeaveCategory | null = null;
  form: CreateLeaveCategoryForm = { name: '', maxDays: null as any };

  getCardData = (rowData: any) => rowData;

  constructor(
    private http: HttpClient,
    private sharedService: SharedService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
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
  }

  ngOnDestroy(): void {
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

  buildColumns(): void {
    this.columns = [
      { dataField: 'name', caption: this.translate.instant('LEAVE_CATEGORIES.NAME') },
      { dataField: 'maxDays', caption: this.translate.instant('LEAVE_CATEGORIES.MAX_DAYS') },
      {
        caption: this.translate.instant('LEAVE_CATEGORIES.ACTIONS'),
        minWidth: 150,
        cellTemplate: (container: any, options: any) => {
          const data = options.data;

          const editBtn = document.createElement('button');
          editBtn.className = 'action-btn edit-btn';
          editBtn.innerHTML = `<i class="dx-icon dx-icon-edit"></i> ${this.translate.instant('LEAVE_CATEGORIES.EDIT')}`;
          editBtn.onclick = () => setTimeout(() => this.ngZone.run(() => {
            this.openEdit(data);
            this.cdr.detectChanges();
          }), 0);

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'action-btn delete-btn';
          deleteBtn.innerHTML = `<i class="dx-icon dx-icon-trash"></i> ${this.translate.instant('LEAVE_CATEGORIES.DELETE')}`;
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
        load: (loadOptions) => {
          const skip = loadOptions.skip ?? 0;
          const take = loadOptions.take ?? this.pageSize;
          const page = Math.floor(skip / take) + 1;
          return firstValueFrom(
            this.http.get<ApiResponse<any>>(
              `${environment.apiUrl}/leave-categories?page=${page}&pageSize=${take}`
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
      }),
      pageSize: this.pageSize,
      paginate: true,
      requireTotalCount: true
    });
  }

  openAdd(): void {
    this.isEditMode = false;
    this.form = { name: '', maxDays: null as any };
    this.showPopup = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.validationGroupRef?.instance?.reset(); }, 0);
  }

  openEdit(lc: LeaveCategory): void {
    this.isEditMode = true;
    this.form = { id: lc.id, name: lc.name, maxDays: lc.maxDays };
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
      this.http.put<ApiResponse<string>>(`${environment.apiUrl}/leave-categories/${this.form.id}`, this.form)
        .subscribe({
          next: (res) => {
            if (res.isSuccess) {
              this.sharedService.showToastMessage(ToastType.Success, 'Leave category updated');
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
      this.http.post<ApiResponse<string>>(`${environment.apiUrl}/leave-categories`, this.form)
        .subscribe({
          next: (res) => {
            if (res.isSuccess) {
              this.sharedService.showToastMessage(ToastType.Success, 'Leave category created');
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

  delete(lc: LeaveCategory): void {
    this.categoryToDelete = lc;
    this.showDeletePopup = true;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.categoryToDelete || this.isDeleting) return;
    this.isDeleting = true;
    this.cdr.detectChanges();
    this.http.delete<ApiResponse<string>>(`${environment.apiUrl}/leave-categories/${this.categoryToDelete.id}`)
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.sharedService.showToastMessage(ToastType.Success, 'Leave category deleted');
            this.sharedDataSource.reload();
          } else {
            this.sharedService.showToastMessage(ToastType.Error, res.error || 'Delete failed');
          }
          this.showDeletePopup = false;
          this.categoryToDelete = null;
          this.isDeleting = false;
          this.cdr.detectChanges();
        },
        error: () => { this.isDeleting = false; this.cdr.detectChanges(); }
      });
  }
}