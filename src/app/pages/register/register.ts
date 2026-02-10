import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatFormFieldModule,
    MatCheckboxModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  rememberMe = false;

  constructor(private http: HttpClient, private router: Router) {}

  register() {
    if (this.password !== this.confirmPassword) {
      alert("Les mots de passe ne correspondent pas");
      return;
    }

    const formData = new FormData();
    formData.append('fullName', this.fullName);
    formData.append('email', this.email);
    formData.append('password', this.password);

    this.http.post('http://localhost:5000/api/account/register', formData)
      .subscribe({
        next: (res: any) => {
          alert(res?.message || "Inscription réussie !");
          this.router.navigate(['/login']);
        },
        error: (err) => {
          alert(err?.error?.message || "Erreur lors de l'inscription");
        }
      });
  }
}
