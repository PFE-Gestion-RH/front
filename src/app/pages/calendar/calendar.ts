import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxSchedulerModule, DxPopupModule, DxButtonModule, DxTemplateModule, DxLoadPanelComponent } from 'devextreme-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CalendarService } from './calendar.service';
import { SharedService } from '../../services/shared.service';
import { UserRole } from '../../models/auth/user.model';
import { CalendarEvent } from '../../models/Calendar';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DxSchedulerModule, DxPopupModule, DxButtonModule, DxTemplateModule, DxLoadPanelComponent, TranslateModule],
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
  analysis: any[] = [];
  showEventPopup = false;
  selectedEvent: CalendarEvent | null = null;

  eventTypeColors: Record<string, string> = {
    absence: '#EF4444',
    permission: '#F59E0B',
  };

  editingConfig = {
    allowAdding: false,
    allowDeleting: false,
    allowUpdating: false,
    allowResizing: false,
    allowDragging: false,
  };

  constructor(
    private calendarService: CalendarService,
    private sharedService: SharedService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.role = this.sharedService.getConnectedRole();
    this.loadEvents();

    // ← ajouter ici
    if (this.role?.toUpperCase() === 'TEAMLEAD') {
      this.loadAnalysis();
    }
  }


  loadEvents(): void {
    this.loading = true;
    this.calendarService.getEvents(this.role).subscribe({
      next: (events: CalendarEvent[]) => {
        this.events = [];
        this.cdr.detectChanges();
        setTimeout(() => {
          this.events = [...events];
          this.loading = false;
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
  loadAnalysis(): void {
    this.calendarService.getAnalysis().subscribe({
      next: (data) => {
        this.analysis = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }
  onOptionChanged(e: any): void { }

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
    if (r === 'ADMIN') return this.translate.instant('CALENDAR.TITLE_ADMIN');
    if (r === 'TEAMLEAD') return this.translate.instant('CALENDAR.TITLE_TEAMLEAD');
    return this.translate.instant('CALENDAR.TITLE_EMPLOYEE');
  }

  get legendItems() {
    return Object.entries(this.eventTypeColors).map(([type, color]) => ({ type, color }));
  }
}