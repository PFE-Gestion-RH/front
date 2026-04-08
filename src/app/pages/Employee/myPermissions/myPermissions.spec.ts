import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyPermissions } from './myPermissions';

describe('MyPermissions', () => {
  let component: MyPermissions;
  let fixture: ComponentFixture<MyPermissions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyPermissions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyPermissions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
