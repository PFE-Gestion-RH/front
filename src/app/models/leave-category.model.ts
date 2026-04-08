export interface LeaveCategory {
  id: number;
  name: string;
  maxDays: number;
}

export interface CreateLeaveCategoryForm {
  id?: number;
  name: string;
  maxDays: number;
}