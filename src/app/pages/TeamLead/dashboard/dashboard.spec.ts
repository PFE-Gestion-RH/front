import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamleadDashboardComponent } from './dashboard';

describe('Dashboard', () => {
  let component: TeamleadDashboardComponent;
  let fixture: ComponentFixture<TeamleadDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamleadDashboardComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TeamleadDashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
