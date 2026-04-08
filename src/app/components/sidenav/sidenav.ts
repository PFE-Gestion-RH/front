import { Component, inject, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DxListModule, DxButtonModule } from 'devextreme-angular';
import { SharedService } from '../../services/shared.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule, RouterModule, DxListModule, DxButtonModule],
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
        { label: 'Dashboard',        icon: 'home',        route: '/admin' },
        { label: 'Users',            icon: 'group',       route: '/admin/users' },
        { label: 'Teams',            icon: 'group',       route: '/admin/teams' },
        { label: 'Leave Categories', icon: 'columnfield', route: '/admin/leave-categories' },
          { label: 'Absences',         icon: 'event',       route: '/admin/absences' },
    { label: 'Permissions',      icon: 'clock',       route: '/admin/permissions' },
        { label: 'Calendar',         icon: 'event',       route: '/admin/calendar' },
{ label: 'Jours férier', icon: 'globe', route: '/admin/publicholidays' },

      ];
    }
  if (this.role === 'TEAMLEAD') {
  return [
    { label: 'Dashboard',        icon: 'home',      route: '/teamlead' },
     { label: 'My Absences',    icon: 'event', route: '/employee/absences' },
      { label: 'My Permissions', icon: 'clock', route: '/employee/permissions' },
    { label: 'Team Absences',    icon: 'event',     route: '/teamlead/absences' },
    { label: 'Team Permissions', icon: 'clock',     route: '/teamlead/permissions' },
    { label: 'Calendar',         icon: 'event',     route: '/teamlead/calendar' },
   
  ];
}
    return [
      { label: 'Dashboard',      icon: 'home',  route: '/employee' },
      { label: 'My Absences',    icon: 'event', route: '/employee/absences' },
      { label: 'My Permissions', icon: 'clock', route: '/employee/permissions' },
      { label: 'Calendar',       icon: 'event', route: '/employee/calendar' },
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