import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaveCategories } from './leave-categories';

describe('LeaveCategories', () => {
  let component: LeaveCategories;
  let fixture: ComponentFixture<LeaveCategories>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveCategories]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeaveCategories);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
