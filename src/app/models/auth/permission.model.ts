
export interface PermissionDto {
  id: number;
  reason: string;
  startDate: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
}

export interface CreatePermissionDto {
  reason: string;
  startDate: string;
  startTime: string;
  endTime: string;
}