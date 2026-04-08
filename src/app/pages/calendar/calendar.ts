import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxSchedulerModule, DxPopupModule, DxButtonModule, DxTemplateModule, DxLoadPanelComponent } from 'devextreme-angular';
import { CalendarService } from './calendar.service';
import { SharedService } from '../../services/shared.service';
import { UserRole } from '../../models/auth/user.model';
import { CalendarEvent } from '../../models/Calendar';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DxSchedulerModule, DxPopupModule, DxButtonModule, DxTemplateModule, DxLoadPanelComponent],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.scss'],
})
export class CalendarComponent implements OnInit {

  role: UserRole | undefined;
  events: CalendarEvent[] = [];
  currentDate: Date = new Date();
  currentView: string = 'month';
  views = ['month', 'week', 'day', 'agenda'];
  loading = false;

  showEventPopup = false;
  selectedEvent: CalendarEvent | null = null;

  eventTypeColors: Record<string, string> = {
    absence:    '#EF4444',
    permission: '#F59E0B',
  };

  editingConfig = {
    allowAdding:   false,
    allowDeleting: false,
    allowUpdating: false,
    allowResizing: false,
    allowDragging: false,
  };

  constructor(
    private calendarService: CalendarService,
    private sharedService: SharedService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.role = this.sharedService.getConnectedRole();
    // ← un seul appel au démarrage, pas de filtre par mois
    this.loadEvents();
  }

loadEvents(): void {
  this.loading = true;
  this.calendarService.getEvents(this.role).subscribe({
    next: (events: CalendarEvent[]) => {
      this.events = [];              // ← vider d'abord
      this.cdr.detectChanges();     // ← forcer render vide
      setTimeout(() => {            // ← attendre un tick
        this.events = [...events];  // ← puis injecter les données
        this.loading = false;
        this.cdr.detectChanges();   // ← forcer render avec données
      }, 0);
    },
    error: (err: any) => {
      console.error(err);
      this.loading = false;
      this.cdr.detectChanges();
    }
  });
}

  // ← vide, le scheduler gère l'affichage par mois tout seul
  onOptionChanged(e: any): void {}

  onAppointmentRendered(e: any): void {
    const type = e.appointmentData?.type ?? 'absence';
    const color = this.eventTypeColors[type] ?? '#6B7280';
    e.appointmentElement.style.backgroundColor = color;
    e.appointmentElement.style.borderColor = color;
    e.appointmentElement.style.color = '#fff';
    e.appointmentElement.style.borderRadius = '6px';
    e.appointmentElement.style.fontSize = '12px';
    e.appointmentElement.style.fontWeight = '500';
  }

  onAppointmentClick(e: any): void {
    e.cancel = true;
    this.selectedEvent = e.appointmentData;
    this.showEventPopup = true;
  }

  onAppointmentDblClick(e: any): void {
    e.cancel = true;
  }

  onAppointmentFormOpening(e: any): void {
    e.cancel = true;
  }

  get popupTitle(): string {
    return this.selectedEvent?.type
      ? (this.selectedEvent.type.charAt(0).toUpperCase() + this.selectedEvent.type.slice(1))
      : '';
  }

  get pageTitle(): string {
    const r = this.role?.toUpperCase();
    if (r === 'ADMIN')    return 'All Employees — Absences & Permissions';
    if (r === 'TEAMLEAD') return 'My Team — Absences & Permissions';
    return 'My Absences & Permissions';
  }

  get legendItems() {
    return Object.entries(this.eventTypeColors).map(([type, color]) => ({ type, color }));
  }
}