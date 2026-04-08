export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  teamId?: number | null;
profilePicture?: string;
}
export enum UserRole {
  Employee = 'Employee',
  TeamLead = 'TeamLead',
  Admin = 'Admin',
}
