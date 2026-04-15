import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SharedService } from './services/shared.service';
import { Toast } from "./components/toast/toast";
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor(
    public sharedService: SharedService,
    private translate: TranslateService
  ) {
    // Langue par utilisateur connecté
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || user.email || 'default';
    const savedLanguage = localStorage.getItem(`language_${userId}`) || 'en';

    this.translate.setDefaultLang('en');
    this.translate.use(savedLanguage);

    this.checkTokenExpiration();
  }

  private checkTokenExpiration(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiration = payload.exp * 1000;
      if (Date.now() > expiration) {
        this.sharedService.logout();
      }
    } catch (e) {
      this.sharedService.logout();
    }
  }
}