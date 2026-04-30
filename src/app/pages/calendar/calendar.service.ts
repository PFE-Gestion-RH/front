import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { UserRole } from '../../models/auth/user.model';
import { ApiResponse } from '../../models/auth/api-response.model';
import { SharedService } from '../../services/shared.service';
import { environment } from '../../environments/environment';
import { CalendarEvent } from '../../models/Calendar';

@Injectable({ providedIn: 'root' })
export class CalendarService {

  private cache = new Map<string, CalendarEvent[]>();

  constructor(
    private http: HttpClient,
    private sharedService: SharedService
  ) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.sharedService.getToken()}`
    });
  }
  getAnalysis(): Observable<any[]> {
    return this.http.get<{ isSuccess: boolean; data: any[] }>(
      `${environment.apiUrl}/calendar/analysis`,
      { headers: this.getHeaders() }
    ).pipe(
      map(res => res.data ?? []),
      catchError(() => of([]))
    );
  }
  getEvents(role: UserRole | undefined): Observable<CalendarEvent[]> {
    const key = role?.toUpperCase() ?? 'UNKNOWN';

    if (this.cache.has(key)) {
      console.log(`📦 Cache hit: ${key}`);
      return of(this.cache.get(key)!);
    }

    console.log(`🌐 API call: ${key}`);
    const r = role?.toUpperCase();
    let events$: Observable<CalendarEvent[]>;

    if (r === 'ADMIN') events$ = this.getAllEvents();
    else if (r === 'TEAMLEAD') events$ = this.getTeamEvents();
    else events$ = this.getMyEvents();

    return events$.pipe(
      tap(events => this.cache.set(key, events))
    );
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  private getAllEvents(): Observable<CalendarEvent[]> {
    const absences$ = this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/demande/all/absences?page=1&pageSize=1000&status=Accepted`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ isSuccess: false, data: [] } as any)));

    const permissions$ = this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/demande/all/permissions?page=1&pageSize=1000&status=Accepted`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ isSuccess: false, data: [] } as any)));

    return forkJoin([absences$, permissions$]).pipe(
      map(([absRes, permRes]) => {
        const absences = this.extractArray(absRes).map(a => this.mapAbsence(a, true));
        const permissions = this.extractArray(permRes).map(p => this.mapPermission(p, true));
        return [...absences, ...permissions];
      })
    );
  }

  private getTeamEvents(): Observable<CalendarEvent[]> {
    const absences$ = this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/demande/team/absences?page=1&pageSize=1000&status=Accepted`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ isSuccess: false, data: [] } as any)));

    const permissions$ = this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/demande/team/permissions?page=1&pageSize=1000&status=Accepted`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ isSuccess: false, data: [] } as any)));

    return forkJoin([absences$, permissions$]).pipe(
      map(([absRes, permRes]) => {
        const absences = this.extractArray(absRes).map(a => this.mapAbsence(a, true));
        const permissions = this.extractArray(permRes).map(p => this.mapPermission(p, true));
        return [...absences, ...permissions];
      })
    );
  }

  private getMyEvents(): Observable<CalendarEvent[]> {
    const absences$ = this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/demande/my/absences?page=1&pageSize=1000`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ isSuccess: false, data: [] } as any)));

    const permissions$ = this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/demande/my/permissions?page=1&pageSize=1000`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ isSuccess: false, data: [] } as any)));

    return forkJoin([absences$, permissions$]).pipe(
      map(([absRes, permRes]) => {
        const absences = this.extractArray(absRes).map(a => this.mapAbsence(a, false));
        const permissions = this.extractArray(permRes).map(p => this.mapPermission(p, false));
        return [...absences, ...permissions];
      })
    );
  }

  private mapAbsence(a: any, showEmployeeName = false): CalendarEvent {
    const name = a.employeeName ?? a.userName ?? '';
    const displayName = showEmployeeName && name ? ` — ${name}` : '';
    return {
      id: a.id,
      text: ` Absence${displayName}`,
      startDate: new Date(a.startDate),
      endDate: new Date(a.endDate),
      type: 'absence',
      employeeId: a.employeeId,
      employeeName: name,
      description: a.leaveCategoryName ?? a.reason ?? '',
      allDay: true,
    };
  }

  private mapPermission(p: any, showEmployeeName = false): CalendarEvent {
    const name = p.employeeName ?? p.userName ?? '';
    const displayName = showEmployeeName && name ? ` — ${name}` : '';
    const date = new Date(p.startDate);
    return {
      id: p.id + 100000,
      text: ` Permission${displayName}`,
      startDate: date,
      endDate: date,
      type: 'permission',
      employeeId: p.employeeId,
      employeeName: name,
      description: p.reason ?? '',
      allDay: true,
      startTime: p.startTime ? p.startTime.substring(0, 5) : undefined,
      endTime: p.endTime ? p.endTime.substring(0, 5) : undefined,
    };
  }

  private extractArray(res: ApiResponse<any>): any[] {
    if (!res.isSuccess) return [];
    const data = res.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  }
}