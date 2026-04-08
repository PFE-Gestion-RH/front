import { Component, inject } from '@angular/core';
import { SharedService } from '../../services/shared.service';

export enum ToastType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
    Info = 'info'  

}

@Component({
  selector: 'app-toast',
  imports: [],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class Toast {
  protected shared = inject(SharedService);

  close() {
    this.shared.showToast.set(false);
  }
}