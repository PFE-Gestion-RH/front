import {
  Component, OnInit, OnDestroy, NgZone, signal,
  ChangeDetectorRef, ViewEncapsulation, ViewChild, Injector
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
    CommonModule, FormsModule, DxDataGridModule, DxCardViewComponent,
    DxiCardViewColumnComponent, DxoCardViewPagingComponent, DxoCardViewSearchPanelComponent,
    DxoCardViewPagerComponent, DxTemplateModule, DxPopupComponent, DxButtonComponent,
    DxCheckBoxComponent, DxLoadIndicatorModule, DxLoadPanelModule, DxTextBoxModule,
    DxSelectBoxModule, DxValidatorModule, DxValidationGroupComponent, TranslateModule
  ],
  templateUrl: './teams.html',
  styleUrl: './teams.scss',
  encapsulation: ViewEncapsulation.None
})
export class Teams implements OnInit, OnDestroy {

  @ViewChild('validationGroup') validationGroupRef: any;

  sharedDataSource!: DataSource;

  // ─── Utilisateurs ────────────────────────────────────────────────────────────
  // Signal gardé uniquement pour usage interne
  allUsers = signal<User[]>([]);

  // ✅ FIX 1 : Propriétés stables calculées une seule fois dans loadUsers()
  //            Remplacent les getters teamLeads / employees qui étaient recalculés
  //            à chaque cycle de détection → nouvel array → DxSelectBox recharge → stack overflow
  teamLeadsList: any[] = [];
  employeesList: User[] = [];

  // ✅ FIX 2 : Map précalculée pour getMemberNameById()
  //            Évite de lire le signal allUsers() pendant la détection de changement → NG0100
  private memberNameMap = new Map<number, string>();

  // ✅ FIX 3 : Set stable pour gérer la sélection des membres
  //            Remplace teamForm.memberIds comme source de vérité pour isMemberSelected()
  //            → toggleMember ne touche plus au DOM via detectChanges() → pas de boucle
  selectedMemberIds = new Set<number>();

  // ─── Règles de validation ────────────────────────────────────────────────────
  // ✅ FIX 4 : Tableaux déclarés comme propriétés stables
  //            Évite [validationRules]="[{...}]" inline dans le template qui crée
  //            un nouvel array à chaque cycle → DxValidator ngDoCheck boucle → stack overflow
  nameValidationRules: any[] = [];
  teamLeadValidationRules: any[] = [];

  // ─── UI state ────────────────────────────────────────────────────────────────
  pageSize = 10;
  columns: any[] = [];
  activeView: 'grid' | 'card' = 'grid';
  isLoading = false;
  isSaving = false;
  isDeleting = false;

  showPopup = false;
  isEditMode = false;
  showMembersPopup = false;
  showDeletePopup = false;
  teamToDelete: Team | null = null;
  editingTeamId: number | null = null;

  teamForm: CreateTeamForm = { name: '', teamLeadId: null, memberIds: [] };
  getCardData = (rowData: any) => rowData;

  constructor(
    private http: HttpClient,
    private sharedService: SharedService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private injector: Injector
  ) {
    // ✅ FIX 5 : effect() retiré du constructeur
    //            L'ancien effect() appelait cdr.detectChanges() ce qui déclenchait
    //            NG0100 (true→false) pendant la phase d'initialisation de la vue
    //            La vue responsive est désormais gérée uniquement par applyView() + resize event
  }

  ngOnInit(): void {
    this.applyView();
    window.addEventListener('resize', this.onResize);
    this.buildColumns();
    this.buildValidationRules();
    this.initSharedDataSource();
    this.loadUsers();

    this.translate.onLangChange.subscribe(() => {
      this.buildColumns();
      this.buildValidationRules();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.ngZone.run(() => {
      this.applyView();
      this.cdr.detectChanges();
    });
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
  }

  // ✅ FIX 4 : Règles construites une seule fois (et à chaque changement de langue)
  buildValidationRules(): void {
    this.nameValidationRules = [
      { type: 'required', message: this.translate.instant('TEAMS.VALIDATION.NAME_REQUIRED') }
    ];
    this.teamLeadValidationRules = [
      { type: 'required', message: this.translate.instant('TEAMS.VALIDATION.TEAMLEAD_REQUIRED') }
    ];
  }

  buildColumns(): void {
    this.columns = [
      { dataField: 'name', caption: this.translate.instant('TEAMS.TEAM_NAME') },
      { dataField: 'teamLeadName', caption: this.translate.instant('TEAMS.TEAM_LEAD') },
      {
        caption: this.translate.instant('TEAMS.MEMBERS'),
        calculateCellValue: (row: Team) =>
          row.members.length > 0
            ? row.members.map(m => `${m.firstName} ${m.lastName}`).join(', ')
            : this.translate.instant('TEAMS.NO_MEMBERS')
      },
      {
        caption: this.translate.instant('TEAMS.ACTIONS'),
        minWidth: 200,
        cellTemplate: (container: any, options: any) => {
          const data = options.data;

          const editBtn = document.createElement('button');
          editBtn.className = 'action-btn edit-btn';
          editBtn.innerHTML = `<i class="dx-icon dx-icon-edit"></i> ${this.translate.instant('TEAMS.EDIT')}`;
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
          deleteBtn.innerHTML = `<i class="dx-icon dx-icon-trash"></i> ${this.translate.instant('TEAMS.DELETE')}`;
          deleteBtn.onclick = () => this.ngZone.run(() => this.deleteTeam(data));

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
              const users: User[] = Array.isArray(data) ? data : data.items ?? [];

              // ✅ FIX 1 : Calculé une seule fois ici, jamais dans un getter
              this.teamLeadsList = users
                .filter(u => u.role === UserRole.TeamLead)
                .map(u => ({ ...u, fullName: `${u.firstName} ${u.lastName}` }));

              this.employeesList = users.filter(u => u.role === UserRole.Employee);

              // ✅ FIX 2 : Map précalculée O(1)
              this.memberNameMap = new Map(
                users.map(u => [u.id, `${u.firstName} ${u.lastName}`])
              );

              this.allUsers.set(users);
              this.cdr.detectChanges();
            }
          });
        }
      });
  }

  // ✅ FIX 2 : Lookup stable via Map, plus de lecture du signal pendant le check
  getMemberNameById(id: number): string {
    return this.memberNameMap.get(id) ?? '';
  }

  // ✅ FIX 3 : isMemberSelected lit le Set stable, pas teamForm.memberIds directement
  //            → pas de re-création d'array à chaque appel
  isMemberSelected(userId: number): boolean {
    return this.selectedMemberIds.has(userId);
  }

  // ✅ FIX 3 + FIX 6 : toggleMember sans detectChanges()
  //            L'ancien code appelait cdr.detectChanges() ce qui re-rendait DxCheckBox
  //            → onValueChanged se déclenchait → toggleMember → boucle infinie (stack overflow)
  //            Solution : on met à jour le Set et teamForm.memberIds, Angular détecte
  //            la mutation lors du prochain cycle naturel (pas besoin de forcer)
  toggleMember(userId: number): void {
    if (this.selectedMemberIds.has(userId)) {
      this.selectedMemberIds.delete(userId);
    } else {
      this.selectedMemberIds.add(userId);
    }
    // Sync vers teamForm pour le save — on crée un nouveau tableau pour que
    // le @for du template détecte le changement par référence
    this.teamForm.memberIds = Array.from(this.selectedMemberIds);
  }

  openAdd(): void {
    this.isEditMode = false;
    this.editingTeamId = null;
    this.teamForm = { name: '', teamLeadId: null, memberIds: [] };
    // ✅ Reset du Set à l'ouverture
    this.selectedMemberIds = new Set<number>();
    this.showPopup = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.validationGroupRef?.instance?.reset(); }, 0);
  }

  openEdit(team: Team): void {
    this.isEditMode = true;
    this.editingTeamId = team.id;
    // ✅ Init du Set depuis les membres existants
    this.selectedMemberIds = new Set<number>(team.members.map(m => m.id));
    this.teamForm = {
      name: team.name,
      teamLeadId: team.teamLeadId,
      memberIds: Array.from(this.selectedMemberIds)
    };
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

    if (this.isEditMode && this.editingTeamId) {
      this.http.put<ApiResponse<string>>(
        `${environment.apiUrl}/teams/${this.editingTeamId}`, this.teamForm
      ).subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.sharedService.showToastMessage(ToastType.Success, 'Team updated successfully');
            this.showPopup = false;
            this.sharedDataSource.reload();
          } else {
            this.sharedService.showToastMessage(ToastType.Error, res.error || res.message || 'Update failed');
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
              this.sharedService.showToastMessage(ToastType.Error, res.error || res.message || 'Create failed');
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
            this.sharedService.showToastMessage(ToastType.Error, res.error || res.message || 'Delete failed');
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