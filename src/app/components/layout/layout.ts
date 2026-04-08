import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Header } from '../header/header';
import { Sidenav } from '../sidenav/sidenav';

@Component({
  selector: 'app-layout',
  imports: [Header, Sidenav, RouterModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout { }
