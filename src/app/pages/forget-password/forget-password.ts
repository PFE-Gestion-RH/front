import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { DxFormModule, DxButtonModule } from 'devextreme-angular';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.html',
  styleUrls: ['./forget-password.scss'],
    standalone: true, 
  imports: [
    FormsModule,
    DxFormModule,
    DxButtonModule,
    CommonModule,   
  ],
})
export class ForgetPassword {
  forgotPasswordData = {
    email: ''
  };

  message = '';
  showEmailSent = false; // <-- ajouté ici

  async sendResetLink() {
    if (!this.forgotPasswordData.email) {
      this.message = 'Veuillez entrer votre email.';
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/account/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.forgotPasswordData.email })
      });

      const data = await response.json();
      this.message = '';
      this.showEmailSent = true; 
    } catch (err) {
      console.error(err);
      this.message = "Erreur lors de l'envoi du lien.";
    }
  }
}
