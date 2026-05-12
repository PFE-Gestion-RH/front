export interface CalendarEvent {
    id: number;
    text: string;
    startDate: Date;
    endDate: Date;
    type: 'absence' | 'permission' | 'holiday';
    employeeId?: number;
    employeeName?: string;
    isPending?: boolean;

    description?: string;
    allDay?: boolean;
    startTime?: string;   
    endTime?: string;    
}