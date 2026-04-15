// shared/services/calendar.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DayOccupation, PeriodAnalysis } from '../models/calendar.model';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class CalendarService {
    private base = `${environment.apiUrl}/calendar`;
    constructor(private http: HttpClient) { }

    getMonthOccupation(year: number, month: number): Observable<DayOccupation[]> {
        const params = new HttpParams()
            .set('year', year)
            .set('month', month);

        return this.http
            .get<{ isSuccess: boolean; data: DayOccupation[] }>(
                `${this.base}/occupation`, { params })
            .pipe(map(res => res.data));
    }

    getAnalysis(): Observable<PeriodAnalysis[]> {
        return this.http
            .get<{ isSuccess: boolean; data: PeriodAnalysis[] }>(
                `${this.base}/analysis`)
            .pipe(map(res => res.data));
    }
}