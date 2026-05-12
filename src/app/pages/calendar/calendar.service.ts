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
      return of(this.cache.get(key)!);
    }

    const r = role?.toUpperCase();
    let events$: Observable<CalendarEvent[]>;

    if (r === 'ADMIN') events$ = this.getAllEvents();
    else if (r === 'TEAMLEAD') events$ = this.getTeamEvents();
    else events$ = this.getMyEvents();

    // ← Combiner avec les jours fériés
    return forkJoin([events$, this.getHolidays()]).pipe(
      map(([events, holidays]) => [...events, ...holidays]),
      tap(events => this.cache.set(key, events))
    );
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  private getHolidays(): Observable<CalendarEvent[]> {
    const year = new Date().getFullYear();
    return this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/public-holidays?year=${year}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(res => {
        if (!res.isSuccess) return [];
        const data = Array.isArray(res.data) ? res.data : [];
        // Dédoublonner par date+name
        const seen = new Set<string>();
        return data
          .filter((h: any) => {
            const key = `${h.date}_${h.name}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((h: any) => ({
            id: h.id + 200000,
            text: ` ${h.name}`,
            startDate: new Date(h.date),
            endDate: new Date(h.date),
            type: 'holiday' as const,
            description: h.nameAr ?? '',
            allDay: true,
          }));
      }),
      catchError(() => of([]))
    );
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
    const absencesAccepted$ = this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/demande/my/absences/accepted`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ isSuccess: false, data: [] } as any)));

    const absencesPending$ = this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/demande/my/absences?page=1&pageSize=1000`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ isSuccess: false, data: [] } as any)));

    const permissionsAccepted$ = this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/demande/my/permissions/accepted`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ isSuccess: false, data: [] } as any)));

    const permissionsPending$ = this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/demande/my/permissions?page=1&pageSize=1000`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ isSuccess: false, data: [] } as any)));

    return forkJoin([absencesAccepted$, absencesPending$, permissionsAccepted$, permissionsPending$]).pipe(
      map(([absAccRes, absPendRes, permAccRes, permPendRes]) => {
        const absAccepted = this.extractArray(absAccRes)
          .map(a => this.mapAbsence(a, false, false));

        const absPending = this.extractArray(absPendRes)
          .filter(a => a.status === 'PendingTeamLead' || a.status === 'PendingAdministration')
          .map(a => this.mapAbsence(a, false, true));

        const permAccepted = this.extractArray(permAccRes)
          .map(p => this.mapPermission(p, false, false));

        const permPending = this.extractArray(permPendRes)
          .filter(p => p.status === 'PendingTeamLead' || p.status === 'PendingAdministration')
          .map(p => this.mapPermission(p, false, true));

        return [...absAccepted, ...absPending, ...permAccepted, ...permPending];
      })
    );
  }

  private mapAbsence(a: any, showEmployeeName = false, isPending = false): CalendarEvent {
    const name = a.employeeName ?? a.userName ?? '';
    const displayName = showEmployeeName && name ? ` — ${name}` : '';
    return {
      id: a.id,
      text: isPending ? ` Absence${displayName}` : `Absence${displayName}`,
      startDate: new Date(a.startDate),
      endDate: new Date(a.endDate),
      type: 'absence',
      isPending: isPending,
      employeeId: a.employeeId,
      employeeName: name,
      description: a.leaveCategoryName ?? a.reason ?? '',
      allDay: true,
    };
  }

  private mapPermission(p: any, showEmployeeName = false, isPending = false): CalendarEvent {
    const name = p.employeeName ?? p.userName ?? '';
    const displayName = showEmployeeName && name ? ` — ${name}` : '';
    const date = new Date(p.startDate);
    return {
      id: p.id + 100000,
      text: isPending ? `Permission${displayName}` : `Permission${displayName}`,
      startDate: date,
      endDate: date,
      type: 'permission',
      isPending: isPending,
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