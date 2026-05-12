import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef, ViewEncapsulation, ViewChild, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SharedService } from '../../../services/shared.service';
import { ToastType } from '../../../components/toast/toast';
import { ApiResponse } from '../../../models/auth/api-response.model';
import { UserForm } from '../../../models/user-form.model';
import { User } from '../../../models/auth/user.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import * as XLSX from 'xlsx';
import {
  DxDataGridModule, DxTemplateModule, DxButtonComponent, DxPopupComponent,
  DxLoadIndicatorModule, DxLoadPanelModule, DxTextBoxModule, DxSelectBoxModule,
  DxValidatorModule, DxValidationGroupComponent
} from 'devextreme-angular';
import { DxCardViewComponent } from 'devextreme-angular';
import {
  DxiCardViewColumnComponent,
  DxoCardViewPagingComponent,
  DxoCardViewSearchPanelComponent,
  DxoCardViewPagerComponent
} from 'devextreme-angular/ui/card-view';
import DataSource from 'devextreme/data/data_source';
import CustomStore from 'devextreme/data/custom_store';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DxDataGridModule, DxCardViewComponent,
    DxiCardViewColumnComponent, DxoCardViewPagingComponent, DxTemplateModule,
    DxoCardViewSearchPanelComponent, DxButtonComponent, DxoCardViewPagerComponent,
    DxPopupComponent, DxLoadIndicatorModule, DxLoadPanelModule, DxTextBoxModule,
    DxSelectBoxModule, DxValidatorModule, DxValidationGroupComponent, TranslateModule
  ],
  templateUrl: './users.html',
  styleUrls: ['./users.scss'],
  encapsulation: ViewEncapsulation.None
})
export class Users implements OnInit, OnDestroy {

  @ViewChild('validationGroup') validationGroupRef: any;

  sharedDataSource!: DataSource;
  pageSize = 10;
  columns: any[] = [];
  activeView: 'grid' | 'card' = 'grid';
  isLoading = false;
  isSaving = false;
  isDeleting = false;
  isToggling = false;

  showPopup = false;
  isEditMode = false;
  showDeletePopup = false;
  userToDelete: User | null = null;
  showTogglePopup = false;
  userToToggle: User | null = null;

  // Import Excel
  showImportPopup = false;
  isImporting = false;
  importPreview: any[] = [];
  importErrors: string[] = [];
  importFile: File | null = null;

  selectedUser: UserForm = {
    firstName: '', lastName: '', employeeNumber: '', email: '', role: 'Employee'
  };

  getCardData = (rowData: any) => rowData;
  roles = ['Employee', 'TeamLead', 'Admin'];

  // ✅ Getters pour éviter les arrow functions dans le template (interdit par Angular)
  get validImportCount(): number {
    return this.importPreview.filter(r => r.valid).length;
  }

  get invalidImportCount(): number {
    return this.importPreview.filter(r => !r.valid).length;
  }

  get canImport(): boolean {
    return !this.isImporting && this.validImportCount > 0;
  }

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

  // ✅ EXPORT EXCEL
  exportToExcel(): void {
    this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/users?page=1&pageSize=1000`
    ).subscribe({
      next: (res) => {
        if (!res.isSuccess) return;
        const users = res.data.items ?? res.data;

        const exportData = users.map((u: any) => ({
          'Employee Number': u.employeeNumber ?? '',
          'First Name': u.firstName ?? '',
          'Last Name': u.lastName ?? '',
          'Email': u.email ?? '',
          'Role': u.role ?? 'Employee',
          'Active': u.isActive ? 'Yes' : 'No'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [
          { wch: 18 }, { wch: 16 }, { wch: 16 },
          { wch: 30 }, { wch: 12 }, { wch: 10 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Users');
        XLSX.writeFile(wb, `users_${new Date().toISOString().slice(0, 10)}.xlsx`);
        this.sharedService.showToastMessage(ToastType.Success, 'Export Excel réussi');
      }
    });
  }

  // ✅ TÉLÉCHARGER TEMPLATE EXCEL
  downloadTemplate(): void {
    const template = [
      {
        'Employee Number': 'EMP-0001',
        'First Name': 'Ahmed',
        'Last Name': 'Ben Ali',
        'Email': 'ahmed.benali@example.com',
        'Role': 'Employee'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 30 }, { wch: 12 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'users_template.xlsx');
  }

  // ✅ IMPORT EXCEL — sélection du fichier
  onImportFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.importFile = file;
    this.importErrors = [];
    this.importPreview = [];

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        const validRoles = ['Employee', 'TeamLead', 'Admin'];
        const errors: string[] = [];
        const preview: any[] = [];

        rows.forEach((row, i) => {
          const lineNum = i + 2;
          const fn = (row['First Name'] ?? '').toString().trim();
          const ln = (row['Last Name'] ?? '').toString().trim();
          const email = (row['Email'] ?? '').toString().trim();
          const empNum = (row['Employee Number'] ?? '').toString().trim();
          const role = (row['Role'] ?? 'Employee').toString().trim();

          if (!fn) errors.push(`Ligne ${lineNum} : First Name manquant`);
          if (!ln) errors.push(`Ligne ${lineNum} : Last Name manquant`);
          if (!email || !email.includes('@')) errors.push(`Ligne ${lineNum} : Email invalide`);
          if (!empNum) errors.push(`Ligne ${lineNum} : Employee Number manquant`);
          if (!validRoles.includes(role)) errors.push(`Ligne ${lineNum} : Role invalide (${role})`);

          preview.push({
            employeeNumber: empNum,
            firstName: fn,
            lastName: ln,
            email: email,
            role: validRoles.includes(role) ? role : 'Employee',
            valid: !errors.some(e => e.startsWith(`Ligne ${lineNum}`))
          });
        });

        this.importPreview = preview;
        this.importErrors = errors;
        this.cdr.detectChanges();
      } catch (err) {
        this.importErrors = ['Fichier Excel invalide'];
        this.cdr.detectChanges();
      }
    };
    reader.readAsBinaryString(file);
    event.target.value = '';
  }

  // ✅ CONFIRMER L'IMPORT
  confirmImport(): void {
    const validRows = this.importPreview.filter(r => r.valid);
    if (!validRows.length) return;

    this.isImporting = true;
    this.cdr.detectChanges();

    this.http.post<ApiResponse<any>>(
      `${environment.apiUrl}/users/import`, validRows
    ).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.sharedService.showToastMessage(
            ToastType.Success,
            `${validRows.length} utilisateur(s) importé(s) avec succès`
          );
          this.showImportPopup = false;
          this.importPreview = [];
          this.importErrors = [];
          this.importFile = null;
          this.sharedDataSource.reload();
        } else {
          this.sharedService.showToastMessage(ToastType.Error, res.error || 'Import échoué');
        }
        this.isImporting = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isImporting = false; this.cdr.detectChanges(); }
    });
  }

  buildColumns(): void {
    this.columns = [
      { dataField: 'employeeNumber', caption: this.translate.instant('USERS.EMPLOYEE_NUMBER') },
      { dataField: 'firstName', caption: this.translate.instant('USERS.FIRST_NAME') },
      { dataField: 'lastName', caption: this.translate.instant('USERS.LAST_NAME') },
      { dataField: 'email', caption: this.translate.instant('USERS.EMAIL') },
      { dataField: 'role', caption: this.translate.instant('USERS.ROLE') },
      {
        caption: this.translate.instant('USERS.STATUS'),
        cellTemplate: (container: any, options: any) => {
          const isActive = options.data.isActive;
          const span = document.createElement('span');
          span.textContent = isActive
            ? this.translate.instant('USERS.ACTIVE')
            : this.translate.instant('USERS.INACTIVE');
          span.className = isActive ? 'badge active' : 'badge inactive';
          container.append(span);
        }
      },
      {
        caption: this.translate.instant('USERS.ACTIONS'),
        minWidth: 450,
        cellTemplate: (container: any, options: any) => {
          const data = options.data;

          const editBtn = document.createElement('button');
          editBtn.className = 'action-btn edit-btn';
          editBtn.innerHTML = `<i class="dx-icon dx-icon-edit"></i> ${this.translate.instant('USERS.EDIT')}`;
          editBtn.onclick = () => this.openEdit(data);

          const resendBtn = document.createElement('button');
          resendBtn.className = 'action-btn';
          resendBtn.style.color = '#3B8AB2';
          resendBtn.style.borderColor = '#3B8AB2';
          resendBtn.innerHTML = `<i class="dx-icon dx-icon-email"></i> ${this.translate.instant('USERS.RESEND')}`;
          resendBtn.onclick = () => this.resendCredentials(data);

          const toggleBtn = document.createElement('button');
          toggleBtn.className = 'action-btn toggle-btn';
          toggleBtn.innerHTML = data.isActive
            ? `<i class="dx-icon dx-icon-minus"></i> ${this.translate.instant('USERS.DEACTIVATE')}`
            : `<i class="dx-icon dx-icon-check"></i> ${this.translate.instant('USERS.ACTIVATE')}`;
          toggleBtn.onclick = () => this.toggleActive(data);

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'action-btn delete-btn';
          deleteBtn.innerHTML = `<i class="dx-icon dx-icon-trash"></i> ${this.translate.instant('USERS.DELETE')}`;
          deleteBtn.onclick = () => this.deleteUser(data);

          container.append(editBtn, resendBtn, toggleBtn, deleteBtn);
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
              `${environment.apiUrl}/users?page=${page}&pageSize=${take}`
            )
          ).then(res => {
            if (res.isSuccess) {
              return { data: res.data.items, totalCount: res.data.totalCount };
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
    this.selectedUser = { firstName: '', lastName: '', employeeNumber: '', email: '', role: 'Employee' };
    this.showPopup = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.validationGroupRef?.instance?.reset(); }, 0);
  }

  openEdit(user: User): void {
    this.isEditMode = true;
    this.selectedUser = { ...user, employeeNumber: user.employeeNumber ?? '' };
    this.showPopup = true;
    this.cdr.detectChanges();
  }

  save(validationGroup: any): void {
    if (!this.isEditMode) {
      const result = validationGroup.instance.validate();
      if (!result.isValid) {
        this.sharedService.showToastMessage(ToastType.Error, 'Please fill all required fields');
        return;
      }
    }
    if (this.isSaving) return;
    this.isSaving = true;
    this.cdr.detectChanges();

    if (this.isEditMode) {
      this.http.put<ApiResponse<string>>(`${environment.apiUrl}/users/${this.selectedUser.id}`, this.selectedUser)
        .subscribe({
          next: (res) => {
            if (res.isSuccess) {
              this.sharedService.showToastMessage(ToastType.Success, 'User updated successfully');
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
      this.http.post<ApiResponse<string>>(`${environment.apiUrl}/users`, this.selectedUser)
        .subscribe({
          next: (res) => {
            if (res.isSuccess) {
              this.sharedService.showToastMessage(ToastType.Success, 'User added successfully. Credentials sent by email.');
              this.showPopup = false;
              this.sharedDataSource.reload();
            } else {
              this.sharedService.showToastMessage(ToastType.Error, res.error || 'Add failed');
            }
            this.isSaving = false;
            this.cdr.detectChanges();
          },
          error: () => { this.isSaving = false; this.cdr.detectChanges(); }
        });
    }
  }

  resendCredentials(user: User): void {
    this.http.post<ApiResponse<string>>(
      `${environment.apiUrl}/users/${user.id}/resend-credentials`, {}
    ).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.sharedService.showToastMessage(ToastType.Success, 'Credentials resent successfully');
        } else {
          this.sharedService.showToastMessage(ToastType.Error, res.error || 'Failed');
        }
        this.cdr.detectChanges();
      },
      error: () => { this.cdr.detectChanges(); }
    });
  }

  deleteUser(user: User): void {
    this.userToDelete = user;
    this.showDeletePopup = true;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.userToDelete || this.isDeleting) return;
    this.isDeleting = true;
    this.cdr.detectChanges();
    this.http.delete<ApiResponse<string>>(`${environment.apiUrl}/users/${this.userToDelete.id}`)
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.sharedService.showToastMessage(ToastType.Success, 'User deleted successfully');
            this.sharedDataSource.reload();
          } else {
            this.sharedService.showToastMessage(ToastType.Error, res.error || 'Delete failed');
          }
          this.showDeletePopup = false;
          this.userToDelete = null;
          this.isDeleting = false;
          this.cdr.detectChanges();
        },
        error: () => { this.isDeleting = false; this.cdr.detectChanges(); }
      });
  }

  toggleActive(user: User): void {
    this.userToToggle = user;
    this.showTogglePopup = true;
    this.cdr.detectChanges();
  }

  confirmToggle(): void {
    if (!this.userToToggle || this.isToggling) return;
    this.isToggling = true;
    this.cdr.detectChanges();
    this.http.patch<ApiResponse<string>>(`${environment.apiUrl}/users/${this.userToToggle.id}/toggle`, {})
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.sharedService.showToastMessage(ToastType.Success, res.message || 'Status updated');
            this.sharedDataSource.reload();
          }
          this.showTogglePopup = false;
          this.userToToggle = null;
          this.isToggling = false;
          this.cdr.detectChanges();
        },
        error: () => { this.isToggling = false; this.cdr.detectChanges(); }
      });
  }
}