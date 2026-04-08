import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAbsences } from './admin-absences';

describe('AdminAbsences', () => {
  let component: AdminAbsences;
  let fixture: ComponentFixture<AdminAbsences>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAbsences]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminAbsences);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
