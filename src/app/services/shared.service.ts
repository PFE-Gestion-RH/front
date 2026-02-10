import { Injectable } from '@angular/core';
import { User, UserRole } from '../models/auth/user.model';

@Injectable({ providedIn: 'root' })
export class SharedService {
  constructor() {}

  public getConnectedRole(): UserRole | undefined {
    const userInfo: User = <User>JSON.parse(localStorage.getItem('userInfo') ?? '{}');

    return userInfo?.Role;
  }
}
