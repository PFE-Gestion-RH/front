import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamPermissions } from './team-permissions';

describe('TeamPermissions', () => {
  let component: TeamPermissions;
  let fixture: ComponentFixture<TeamPermissions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamPermissions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamPermissions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
