import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { SharedService } from './shared.service';
import { environment } from '../environments/environment';

export interface StatusChangedEvent {
  requestId: number;
  newStatus: string;
  type: string;
  message: string;
  rejectionReason?: string;  // ✅ Ajouter
}

export interface NewRequestEvent {
  requestId: number;
  type: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection!: signalR.HubConnection;

  requestStatusChanged$ = new Subject<StatusChangedEvent>();
  newRequestReceived$ = new Subject<NewRequestEvent>();

  constructor(private sharedService: SharedService) {}

  startConnection(userId: string, role: string): void {

    const hubUrl = environment.apiUrl.replace('/api', '') + '/hubs/notifications';

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.sharedService.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .build();

    // ✅ rejectionReason sera automatiquement mappé depuis le backend
    this.hubConnection.on('RequestStatusChanged', (data: StatusChangedEvent) => {
      console.log('📩 StatusChanged reçu:', data);
      this.requestStatusChanged$.next(data);
    });

    this.hubConnection.on('NewRequestReceived', (data: NewRequestEvent) => {
      this.newRequestReceived$.next(data);
    });

    this.hubConnection.start()
      .then(() => {
        this.hubConnection.invoke('JoinUserGroup', userId);
        this.hubConnection.invoke('JoinRoleGroup', role);
      })
      .catch(err => console.error('SignalR Error:', err));
  }

  stopConnection(): void {
    this.hubConnection?.stop();
  }
}