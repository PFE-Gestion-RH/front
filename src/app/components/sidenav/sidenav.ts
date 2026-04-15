import { Component, inject, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DxListModule, DxButtonModule } from 'devextreme-angular';
import { SharedService } from '../../services/shared.service';
import { TranslateModule } from '@ngx-translate/core';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule, RouterModule, DxListModule, DxButtonModule, TranslateModule],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss',
})
export class Sidenav {
  protected sharedService = inject(SharedService);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (window.innerWidth > 1024) return;
    const target = event.target as HTMLElement;
    const clickedInsideSidenav = target.closest('.sidenav');
    const clickedHamburger = target.closest('.hamburger-btn');
    if (!clickedInsideSidenav && !clickedHamburger) {
      this.sharedService.toggleSideNav(false);
    }
  }

  get role(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role?.toUpperCase() || '';
  }

  get mainLinks(): NavItem[] {
    if (this.role === 'ADMIN') {
      return [
        { label: 'SIDEBAR.DASHBOARD', icon: 'home', route: '/admin' },
        { label: 'SIDEBAR.USERS', icon: 'group', route: '/admin/users' },
        { label: 'SIDEBAR.TEAMS', icon: 'group', route: '/admin/teams' },
        { label: 'SIDEBAR.LEAVE_CATEGORIES', icon: 'columnfield', route: '/admin/leave-categories' },
        { label: 'SIDEBAR.ABSENCES', icon: 'event', route: '/admin/absences' },
        { label: 'SIDEBAR.PERMISSIONS', icon: 'clock', route: '/admin/permissions' },
        { label: 'SIDEBAR.CALENDAR', icon: 'event', route: '/admin/calendar' },
        { label: 'SIDEBAR.PUBLIC_HOLIDAYS', icon: 'globe', route: '/admin/publicholidays' },
      ];
    }

    if (this.role === 'TEAMLEAD') {
      return [
        { label: 'SIDEBAR.DASHBOARD', icon: 'home', route: '/teamlead' },
        // CORRIGÉ : pointaient vers /employee/absences et /employee/permissions
        { label: 'SIDEBAR.MY_ABSENCES', icon: 'event', route: '/teamlead/myabsences' },
        { label: 'SIDEBAR.MY_PERMISSIONS', icon: 'clock', route: '/teamlead/mypermissions' },
        { label: 'SIDEBAR.TEAM_ABSENCES', icon: 'event', route: '/teamlead/absences' },
        { label: 'SIDEBAR.TEAM_PERMISSIONS', icon: 'clock', route: '/teamlead/permissions' },
        { label: 'SIDEBAR.CALENDAR', icon: 'event', route: '/teamlead/calendar' },
      ];
    }

    // Employee
    return [
      { label: 'SIDEBAR.DASHBOARD', icon: 'home', route: '/employee' },
      { label: 'SIDEBAR.MY_ABSENCES', icon: 'event', route: '/employee/absences' },
      { label: 'SIDEBAR.MY_PERMISSIONS', icon: 'clock', route: '/employee/permissions' },
      { label: 'SIDEBAR.CALENDAR', icon: 'event', route: '/employee/calendar' },
    ];
  }

  get settingsRoute(): string {
    if (this.role === 'ADMIN') return '/admin/settings';
    if (this.role === 'TEAMLEAD') return '/teamlead/settings';
    return '/employee/settings';
  }

  closeMenu(): void {
    if (window.innerWidth <= 1024) {
      this.sharedService.toggleSideNav(false);
    }
  }
}