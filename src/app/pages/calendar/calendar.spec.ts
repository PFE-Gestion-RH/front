import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DxSchedulerModule } from 'devextreme-angular';
import { CalendarService, CalendarEvent } from './calendar.service';
import { SharedService } from '../../services/shared.service';
import { UserRole } from '../../models/auth/user.model';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DxSchedulerModule],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.scss']
})
export class CalendarComponent implements OnInit {

  role: UserRole | undefined;
  events: CalendarEvent[] = [];
  currentDate: Date = new Date();
  currentView: string = 'month';
  views = ['month', 'week', 'day', 'agenda'];

  eventTypeColors: Record<string, string> = {
    absence:    '#EF4444',
    permission: '#F59E0B',
  };

  constructor(
    private calendarService: CalendarService,
    private sharedService: SharedService
  ) {}

  ngOnInit(): void {
    this.role = this.sharedService.getConnectedRole();
    this.loadEvents();
  }

  loadEvents(): void {
    this.calendarService.getEvents(this.role).subscribe({
      next: (events) => this.events = events,
      error: (err) => console.error('Error loading calendar events:', err)
    });
  }

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