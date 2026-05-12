import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';
import { SharedService } from './shared.service';
import { TeamAnalysis } from '../models/TeamAnalysis ';

@Injectable({ providedIn: 'root' })
export class DeepSeekService {

    constructor(
        private http: HttpClient,
        private sharedService: SharedService
    ) { }

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
            Authorization: `Bearer ${this.sharedService.getToken()}`
        });
    }

    async getRecommendation(
        avgRate: number,
        maxAbsent: number,
        totalMembers: number,
        startDate: string,
        endDate: string
    ): Promise<string> {
        const body = { avgRate, maxAbsent, totalMembers, startDate, endDate };
        const res: any = await this.http.post(
            `${environment.apiUrl}/groq/recommendation`, // ← corrigé
            body,
            { headers: this.getHeaders() }
        ).toPromise();
        return res?.message ?? '';
    }

    async getAlternatives(
        avgRate: number,
        maxAbsent: number,
        totalMembers: number,
        startDate: string,
        endDate: string
    ): Promise<{ startDate: string; endDate: string; reason: string }[]> {
        const body = { avgRate, maxAbsent, totalMembers, startDate, endDate };
        const res: any = await this.http.post(
            `${environment.apiUrl}/groq/alternatives`, // ← corrigé
            body,
            { headers: this.getHeaders() }
        ).toPromise();
        try {
            const cleaned = (res?.json ?? '[]').replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned) ?? [];
        } catch {
            return [];
        }
    }

    async getTeamAnalysis(
        startDate: string,
        endDate: string,
        avgRate: number,
        maxAbsent: number,
        totalMembers: number
    ): Promise<{ analyses: TeamAnalysis[] }> {
        const body = { startDate, endDate, avgRate, maxAbsent, totalMembers };
        const res: any = await this.http.post(
            `${environment.apiUrl}/groq/team-analysis`, // ← déjà correct
            body,
            { headers: this.getHeaders() }
        ).toPromise();
        return res ?? { analyses: [] };
    }
}