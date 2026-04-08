import { Component, OnInit, NgZone, ChangeDetectorRef, ViewEncapsulation, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SharedService } from '../../../services/shared.service';
import { ToastType } from '../../../components/toast/toast';
import { ApiResponse } from '../../../models/auth/api-response.model';
import { UserForm } from '../../../models/user-form.model';
import { User } from '../../../models/auth/user.model';
import {
  DxDataGridModule, DxTemplateModule, DxButtonComponent, DxPopupComponent,
  DxLoadIndicatorModule, DxLoadPanelModule, DxTextBoxModule, DxSelectBoxModule,
  DxValidatorModule, DxValidationGroupComponent
} from 'devextreme-angular';
import { dxDataGridColumn } from 'devextreme/ui/data_grid';
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
    CommonModule,
    FormsModule,
    DxDataGridModule,
    DxCardViewComponent,
    DxiCardViewColumnComponent,
    DxoCardViewPagingComponent,
    DxTemplateModule,
    DxoCardViewSearchPanelComponent,
    DxButtonComponent,
    DxoCardViewPagerComponent,
    DxPopupComponent,
    DxLoadIndicatorModule,
    DxLoadPanelModule,
    DxTextBoxModule,
    DxSelectBoxModule,
    DxValidatorModule,
    DxValidationGroupComponent
  ],
  templateUrl: './users.html',
  styleUrls: ['./users.scss'],
  encapsulation: ViewEncapsulation.None
})
export class Users implements OnInit {

  @ViewChild('validationGroup') validationGroupRef: any;

  sharedDataSource!: DataSource;
  pageSize = 10;

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

  selectedUser: UserForm = {
    firstName: '',
    lastName: '',
    email: '',
    role: 'Employee',
    password: ''
  };

  columns: (string | dxDataGridColumn<any, any>)[] = [
    { dataField: 'firstName', caption: 'First Name' },
    { dataField: 'lastName', caption: 'Last Name' },
    { dataField: 'email', caption: 'Email' },
    { dataField: 'role', caption: 'Role' },
    {
      caption: 'Status',
      cellTemplate: (container: any, options: any) => {
        const isActive = options.data.isActive;
        const span = document.createElement('span');
        span.textContent = isActive ? 'Active' : 'Inactive';
        span.className = isActive ? 'badge active' : 'badge inactive';
        container.append(span);
      }
    },
    {
      caption: 'Actions',
      minWidth: 340,
      cellTemplate: (container: any, options: any) => {
        const data = options.data;

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit-btn';
        editBtn.innerHTML = '<i class="dx-icon dx-icon-edit"></i> Edit';
        editBtn.onclick = () => this.openEdit(data);

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'action-btn toggle-btn';
        toggleBtn.innerHTML = data.isActive
          ? '<i class="dx-icon dx-icon-minus"></i> Deactivate'
          : '<i class="dx-icon dx-icon-check"></i> Activate';
        toggleBtn.onclick = () => this.toggleActive(data);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.innerHTML = '<i class="dx-icon dx-icon-trash"></i> Delete';
        deleteBtn.onclick = () => this.deleteUser(data);

        container.append(editBtn, toggleBtn, deleteBtn);
      }
    }
  ];

  getCardData = (rowData: any) => rowData;
  roles = ['Employee', 'TeamLead', 'Admin'];

  constructor(
    private http: HttpClient,
    private sharedService: SharedService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initSharedDataSource();
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
              return {
                data: res.data.items,
                totalCount: res.data.totalCount
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
    this.selectedUser = { firstName: '', lastName: '', email: '', role: 'Employee', password: '' };
    this.showPopup = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.validationGroupRef?.instance?.reset();
    }, 0);
  }

  openEdit(user: User): void {
    this.isEditMode = true;
    this.selectedUser = { ...user, password: '' };
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
              this.sharedService.showToastMessage(ToastType.Success, 'User added successfully');
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