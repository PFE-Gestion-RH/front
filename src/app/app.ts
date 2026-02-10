import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Layout } from './components/layout/layout';
import { UserRole } from './models/auth/user.model';
import { SharedService } from './services/shared.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Layout],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('frontend');
  public connectedUserRole: UserRole | undefined;

  constructor(private sharedService: SharedService) {
    this.connectedUserRole = this.sharedService.getConnectedRole();
  }
}
