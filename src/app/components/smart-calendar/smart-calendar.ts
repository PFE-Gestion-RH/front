import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarService } from '../../services/calendar.service';
import { DayOccupation } from '../../models/calendar.model';
import { DxCalendarModule, DxLoadIndicatorModule } from 'devextreme-angular';

@Component({
  selector: 'app-smart-calendar',
  standalone: true,
  imports: [CommonModule, DxCalendarModule, DxLoadIndicatorModule],
  templateUrl: './smart-calendar.html',
  styleUrls: ['./smart-calendar.scss']
})
export class SmartCalendarComponent implements OnInit {

  @Output() dateRangeSelected = new EventEmitter<{ startDate: string; endDate: string }>();

  currentDate = new Date();
  occupationMap = new Map<string, DayOccupation>();
  selectedDayMessage: string | null = null;
  selectionMessage: string = 'Cliquez sur la date de début';
  loading = true;

  startDate: Date | null = null;
  endDate: Date | null = null;
  selectionStep = 1; // 1 = attente start, 2 = attente end

  constructor(
    private calendarService: CalendarService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadMonth(this.currentDate);
  }

  loadMonth(date: Date): void {
    this.loading = true;
    this.calendarService.getMonthOccupation(date.getFullYear(), date.getMonth() + 1)
      .subscribe({
        next: (days) => {
          this.occupationMap.clear();
          days.forEach(d => this.occupationMap.set(d.date.substring(0, 10), d));
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  onValueChanged(e: any): void {
    const selected = new Date(e.value);

    if (this.selectionStep === 1) {
      // Sélection date début
      this.startDate = selected;
      this.endDate = null;
      this.selectionStep = 2;
      this.selectionMessage = 'Cliquez sur la date de fin';

      const key = this.toKey(selected);
      const day = this.occupationMap.get(key);
      this.selectedDayMessage = day
        ? `Début : ${day.absentCount} absent(s) sur ${day.totalMembers} — ${Math.round(day.occupationRate * 100)}%`
        : 'Date de début sélectionnée';

    } else {
      // Sélection date fin
      if (selected < this.startDate!) {
        this.selectedDayMessage = 'La date de fin doit être après la date de début';
        this.cdr.detectChanges();
        return;
      }

      this.endDate = selected;
      this.selectionStep = 1;
      this.selectionMessage = 'Cliquez sur la date de début';

      const startStr = this.toKey(this.startDate!);
      const endStr = this.toKey(this.endDate);

      // Calcule le nb de jours
      const diff = Math.round(
        (this.endDate.getTime() - this.startDate!.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      this.selectedDayMessage = `Période sélectionnée : ${startStr} → ${endStr} (${diff} jour(s))`;

      // Émet l'event vers le parent
      this.dateRangeSelected.emit({ startDate: startStr, endDate: endStr });
    }

    this.cdr.detectChanges();
  }

  onOptionChanged(e: any): void {
    if (e.name === 'currentDate') {
      this.loadMonth(e.value);
    }
  }

  // Couleur de fond selon occupation + highlight plage sélectionnée
  getBgColor(date: Date): string {
    const start = this.startDate;
    const end = this.endDate;

    // Highlight start
    if (start && date.toDateString() === start.toDateString()) return '#0d6efd';
    // Highlight end
    if (end && date.toDateString() === end.toDateString()) return '#0d6efd';
    // Highlight plage
    if (start && end && date > start && date < end) return '#cce5ff';

    // Couleur occupation
    const day = this.occupationMap.get(this.toKey(date));
    if (!day) return 'transparent';
    const colors: Record<string, string> = {
      green: '#d4edda',
      orange: '#ffe5b4',
      red: '#f8d7da'
    };
    return colors[day.color] ?? 'transparent';
  }

  // Couleur texte selon occupation + highlight plage
  getTextColor(date: Date): string {
    const start = this.startDate;
    const end = this.endDate;

    if (start && date.toDateString() === start.toDateString()) return '#fff';
    if (end && date.toDateString() === end.toDateString()) return '#fff';
    if (start && end && date > start && date < end) return '#004085';

    const day = this.occupationMap.get(this.toKey(date));
    if (!day) return 'inherit';
    const colors: Record<string, string> = {
      green: '#155724',
      orange: '#7d4a00',
      red: '#721c24'
    };
    return colors[day.color] ?? 'inherit';
  }

  getWeight(date: Date): string {
    const start = this.startDate;
    const end = this.endDate;
    if (start && date.toDateString() === start.toDateString()) return '700';
    if (end && date.toDateString() === end.toDateString()) return '700';
    return this.occupationMap.has(this.toKey(date)) ? '600' : 'normal';
  }

  // Reset pour réutilisation
  reset(): void {
    this.startDate = null;
    this.endDate = null;
    this.selectionStep = 1;
    this.selectionMessage = 'Cliquez sur la date de début';
    this.selectedDayMessage = null;
    this.cdr.detectChanges();
  }

  private toKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}