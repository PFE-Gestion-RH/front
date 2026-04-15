import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmartCalendar } from './smart-calendar';

describe('SmartCalendar', () => {
  let component: SmartCalendar;
  let fixture: ComponentFixture<SmartCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmartCalendar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SmartCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
