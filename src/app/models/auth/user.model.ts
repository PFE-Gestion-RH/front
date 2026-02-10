export class User {
  FirstName: string;
  LastName: string;
  Id: string;
  Email: string;
  Role: UserRole;
  Token: string;

  get FullName(): string {
    return [this.FirstName, this.LastName].filter(Boolean).join(' ');
  }
}

export enum UserRole {
  Employee = 'Employee',
  TeamLead = 'TeamLead',
  Admin = 'Admin',
}
