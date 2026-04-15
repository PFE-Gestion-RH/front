// shared/models/calendar.model.ts
export interface DayOccupation {
    date: string;           // "2025-07-10"
    absentCount: number;
    totalMembers: number;
    occupationRate: number; // 0.42
    color: 'green' | 'orange' | 'red';
}

export interface PeriodAnalysis {
    dayOfYear: number;
    label: string;          // "1-5 août"
    avgAbsentRate: number;
    colleaguesAbsent: number;
    recurrenceScore: number;
    type: 'recommended' | 'avoid';
    message: string;        // "Recommandé : 10-15 juillet — 1 collègue absent"
}