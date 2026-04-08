import { Component, OnInit, NgZone, signal, ChangeDetectorRef, ViewEncapsulation, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SharedService } from '../../../services/shared.service';
import { ToastType } from '../../../components/toast/toast';
import { ApiResponse } from '../../../models/auth/api-response.model';
import { Team, CreateTeamForm } from '../../../models/team.model';
import { User, UserRole } from '../../../models/auth/user.model';
import {
  DxDataGridModule, DxCardViewComponent, DxTemplateModule, DxPopupComponent,
  DxButtonComponent, DxCheckBoxComponent, DxLoadIndicatorModule, DxLoadPanelModule,
  DxTextBoxModule, DxSelectBoxModule, DxValidatorModule, DxValidationGroupComponent
} from 'devextreme-angular';
import { dxDataGridColumn } from 'devextreme/ui/data_grid';
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
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DxDataGridModule,
    DxCardViewComponent,
    DxiCardViewColumnComponent,
    DxoCardViewPagingComponent,
    DxoCardViewSearchPanelComponent,
    DxoCardViewPagerComponent,
    DxTemplateModule,
    DxPopupComponent,
    DxButtonComponent,
    DxCheckBoxComponent,
    DxLoadIndicatorModule,
    DxLoadPanelModule,
    DxTextBoxModule,
    DxSelectBoxModule,
    DxValidatorModule,
    DxValidationGroupComponent
  ],
  templateUrl: './teams.html',
  styleUrl: './teams.scss',
  encapsulation: ViewEncapsulation.None
})
export class Teams implements OnInit {

  @ViewChild('validationGroup') validationGroupRef: any;

  sharedDataSource!: DataSource;
  allUsers = signal<User[]>([]);
  pageSize = 10;

  isLoading = false;
  isSaving = false;
  isDeleting = false;

  showPopup = false;
  isEditMode = false;
  showMembersPopup = false;
  showDeletePopup = false;
  teamToDelete: Team | null = null;
  editingTeamId: number | null = null;

  columns: (string | dxDataGridColumn<any, any>)[] = [
    { dataField: 'name', caption: 'Team Name' },
    { dataField: 'teamLeadName', caption: 'Team Lead' },
    {
      caption: 'Members',
      calculateCellValue: (row: Team) =>
        row.members.length > 0
          ? row.members.map(m => `${m.firstName} ${m.lastName}`).join(', ')
          : 'No members'
    },
    {
      caption: 'Actions',
      minWidth: 200,
      cellTemplate: (container: any, options: any) => {
        const data = options.data;

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit-btn';
        editBtn.innerHTML = '<i class="dx-icon dx-icon-edit"></i> Edit';
        editBtn.onclick = () => {
          setTimeout(() => {
            this.ngZone.run(() => {
              this.openEdit(data);
              this.cdr.detectChanges();
            });
          }, 0);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.innerHTML = '<i class="dx-icon dx-icon-trash"></i> Delete';
        deleteBtn.onclick = () => this.ngZone.run(() => this.deleteTeam(data));

        container.append(editBtn, deleteBtn);
      }
    }
  ];

  teamForm: CreateTeamForm = { name: '', teamLeadId: null, memberIds: [] };

  getCardData = (rowData: any) => rowData;

  get teamLeads(): any[] {
    return this.allUsers()
      .filter(u => u.role === UserRole.TeamLead)
      .map(u => ({ ...u, fullName: `${u.firstName} ${u.lastName}` }));
  }

  get employees(): User[] {
    return this.allUsers().filter(u => u.role === UserRole.Employee);
  }

  getMemberNameById(id: number): string {
    const user = this.allUsers().find(u => u.id === id);
    return user ? `${user.firstName} ${user.lastName}` : '';
  }

  constructor(
    private http: HttpClient,
    private sharedService: SharedService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initSharedDataSource();
    this.loadUsers();
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
              `${environment.apiUrl}/teams?page=${page}&pageSize=${take}`
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

  loadUsers(): void {
    this.http.get<ApiResponse<any>>(`${environment.apiUrl}/users?page=1&pageSize=1000`)
      .subscribe({
        next: (res) => {
          this.ngZone.run(() => {
            if (res.isSuccess) {
              const data = res.data;
              this.allUsers.set(Array.isArray(data) ? data : data.items ?? []);
            }
          });
        }
      });
  }

  openAdd(): void {
    this.isEditMode = false;
    this.editingTeamId = null;
    this.teamForm = { name: '', teamLeadId: null, memberIds: [] };
    this.showPopup = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.validationGroupRef?.instance?.reset();
    }, 0);
  }

  openEdit(team: Team): void {
    this.isEditMode = true;
    this.editingTeamId = team.id;
    this.teamForm = {
      name: team.name,
      teamLeadId: team.teamLeadId,
      memberIds: team.members.map(m => m.id)
    };
    this.showPopup = true;
    this.cdr.detectChanges();
  }

  toggleMember(userId: number): void {
    const index = this.teamForm.memberIds.indexOf(userId);
    if (index === -1) this.teamForm.memberIds.push(userId);
    else this.teamForm.memberIds.splice(index, 1);
    this.teamForm.memberIds = [...this.teamForm.memberIds];
    this.cdr.detectChanges();
  }

  isMemberSelected(userId: number): boolean {
    return this.teamForm.memberIds.includes(userId);
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

    if (this.isEditMode && this.editingTeamId) {
      this.http.put<ApiResponse<string>>(`${environment.apiUrl}/teams/${this.editingTeamId}`, this.teamForm)
        .subscribe({
          next: (res) => {
            if (res.isSuccess) {
              this.sharedService.showToastMessage(ToastType.Success, 'Team updated successfully');
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
      this.http.post<ApiResponse<string>>(`${environment.apiUrl}/teams`, this.teamForm)
        .subscribe({
          next: (res) => {
            if (res.isSuccess) {
              this.sharedService.showToastMessage(ToastType.Success, 'Team created successfully');
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

  deleteTeam(team: Team): void {
    this.teamToDelete = team;
    this.showDeletePopup = true;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.teamToDelete || this.isDeleting) return;
    this.isDeleting = true;
    this.cdr.detectChanges();

    this.http.delete<ApiResponse<string>>(`${environment.apiUrl}/teams/${this.teamToDelete.id}`)
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.sharedService.showToastMessage(ToastType.Success, 'Team deleted successfully');
            this.sharedDataSource.reload();
          } else {
            this.sharedService.showToastMessage(ToastType.Error, res.error || 'Delete failed');
          }
          this.showDeletePopup = false;
          this.teamToDelete = null;
          this.isDeleting = false;
          this.cdr.detectChanges();
        },
        error: () => { this.isDeleting = false; this.cdr.detectChanges(); }
      });
  }
}