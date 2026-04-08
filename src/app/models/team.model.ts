export interface Team {
  id: number;
  name: string;
  teamLeadId: number;
  teamLeadName: string;
  members: TeamMember[];
}

export interface TeamMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CreateTeamForm {
  name: string;
  teamLeadId: number | null;
  memberIds: number[];
}