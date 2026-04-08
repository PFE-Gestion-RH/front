import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamAbsences } from './team-absences';

describe('TeamAbsences', () => {
  let component: TeamAbsences;
  let fixture: ComponentFixture<TeamAbsences>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamAbsences]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamAbsences);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
