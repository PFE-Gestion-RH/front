export interface CalendarEvent {
    id: number;
    text: string;
    startDate: Date;
    endDate: Date;
    type: 'absence' | 'permission';
    employeeId?: number;
    employeeName?: string;
    description?: string;
    allDay?: boolean;
    startTime?: string;   // ← ajoute
    endTime?: string;     // ← ajoute
}