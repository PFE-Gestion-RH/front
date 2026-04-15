import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDahboard } from './admin-dahboard';

describe('AdminDahboard', () => {
  let component: AdminDahboard;
  let fixture: ComponentFixture<AdminDahboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDahboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDahboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
