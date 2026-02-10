import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms'; 
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss'],
  standalone: true,
  imports: [
   CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule
  ],
})
export class ResetPassword implements OnInit {
  resetForm!: FormGroup;
  email!: string;
  token!: string;
  message!: string;
  isSuccess = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'];
      this.token = params['token'];
    });

    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatch });
  }

  passwordsMatch(group: FormGroup) {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { notMatching: true };
  }
onSubmit() {
  if (this.resetForm.invalid) return;

  const dto = {
    email: this.email,
    token: encodeURIComponent(this.token), 
    newPassword: this.resetForm.get('newPassword')?.value
  };

  console.log('DTO envoyé:', dto); 
  this.http.post('http://localhost:5000/api/account/reset-password', dto, {
    headers: { 'Content-Type': 'application/json' }
  }).subscribe({
    next: (res: any) => {
      this.isSuccess = true;
      this.message = "Mot de passe réinitialisé avec succès ! Redirection vers login...";
      setTimeout(() => this.router.navigate(['/login']), 3000);
    },
    error: (err) => {
      this.isSuccess = false;
      this.message = err.error?.message || "Erreur lors de la réinitialisation";
    }
  });
}

}
