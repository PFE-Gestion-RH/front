export interface PublicHoliday {
  id: number;
  name: string;
  nameAr?: string;
  date: string;
  isRecurring: boolean;
  isActive: boolean;
  dayOfWeek?: string;
  isWeekend?: boolean;
}

export interface CreatePublicHolidayForm {
  id?: number;
  name: string;
  nameAr: string;
  date: string;
  isRecurring: boolean;
}

export interface BusinessDaysResult {
  startDate: string;
  endDate: string;
  totalCalendarDays: number;
  businessDays: number;
  weekendDays: number;
  holidayDays: number;
  holidaysInRange: PublicHoliday[];
}