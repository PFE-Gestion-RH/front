export interface TeamAnalysis {
    teamId: number;
    teamName: string;
    totalMembers: number;
    maxAbsent: number;
    avgRate: number;
    isCritical: boolean;
    groqMessage: string;
    alternatives: { startDate: string; endDate: string; reason: string }[];
}