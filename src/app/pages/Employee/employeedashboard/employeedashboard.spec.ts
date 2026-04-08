import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Employeedashboard } from './employeedashboard';

describe('Employeedashboard', () => {
  let component: Employeedashboard;
  let fixture: ComponentFixture<Employeedashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Employeedashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Employeedashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
