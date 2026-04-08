export interface AbsenceDto {
  id: number;
  type: string;
  status: string;           
  createdAt: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  leaveCategoryId: number;
  leaveCategoryName: string;
  document?: string;
  notes?: string;           
}

export interface CreateAbsenceDto {
  startDate: string;
  endDate: string;
  numberOfDays: number;
  leaveCategoryId: number;
  document?: string | null;
  notes: string;           
}

export interface LeaveBalanceDto {
  leaveCategoryId: number;
  leaveCategoryName: string;
  maxDays: number;
  usedDays: number;
  remainingDays: number;
}