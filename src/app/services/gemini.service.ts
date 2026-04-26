import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';
import { SharedService } from './shared.service';

@Injectable({ providedIn: 'root' })
export class GeminiService {
    constructor(
        private http: HttpClient,
        private sharedService: SharedService
    ) { }

    async getRecommendation(
        avgRate: number,
        maxAbsent: number,
        totalMembers: number,
        startDate: string,
        endDate: string
    ): Promise<string> {
        const headers = new HttpHeaders({
            Authorization: `Bearer ${this.sharedService.getToken()}`
        });

        const body = { avgRate, maxAbsent, totalMembers, startDate, endDate };

        const res: any = await this.http.post(
            `${environment.apiUrl}/groq/recommendation`,
            body,
            { headers }
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
        const headers = new HttpHeaders({
            Authorization: `Bearer ${this.sharedService.getToken()}`
        });

        const body = { avgRate, maxAbsent, totalMembers, startDate, endDate };

        const res: any = await this.http.post(
            `${environment.apiUrl}/groq/alternatives`,
            body,
            { headers }
        ).toPromise();

        try {
            const cleaned = (res?.json ?? '[]').replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned) ?? [];
        } catch {
            return [];
        }
    }
}