import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import {
  DxButtonModule,
  DxCheckBoxModule,
  DxTextBoxModule,
  DxValidationSummaryModule,
  DxValidatorModule,
} from 'devextreme-angular';
import { ApiResponse } from '../../models/auth/api-response.model';
import { User } from '../../models/auth/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    DxTextBoxModule,
    DxButtonModule,
    DxCheckBoxModule,
    DxValidatorModule,
    DxValidationSummaryModule,
    RouterModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  email = '';
  password = '';
  rememberMe: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login() {
    const body = {
      Email: this.email,
      Password: this.password,
    };

    this.http.post<ApiResponse<User>>('http://localhost:5000/api/account/login', body).subscribe({
      next: (res) => {
        console.log('✅ Réponse reçue:', res);

        // Stockez seulement le token et user séparément ou tout data
        localStorage.setItem('userInfo', JSON.stringify(res.data));
        console.log('💾 Stocké dans localStorage:', localStorage.getItem('userInfo'));

        // Vérifiez que le router est bien injecté
        console.log('🔄 Tentative de redirection...');

        // Essayez navigate au lieu de navigateByUrl
        this.router
          .navigate(['/admindashboard'])
          .then((success) => {
            console.log('Navigation réussie?', success);
          })
          .catch((err) => {
            console.error('Erreur navigation:', err);
          });
      },
      error: (err) => {
        console.error('❌ Erreur HTTP:', err);
        alert(err.error?.message || 'Erreur de connexion');
      },
    });
  }
}
