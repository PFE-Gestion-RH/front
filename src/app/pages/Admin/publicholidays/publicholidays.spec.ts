import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Publicholidays } from './publicholidays';

describe('Publicholidays', () => {
  let component: Publicholidays;
  let fixture: ComponentFixture<Publicholidays>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Publicholidays]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Publicholidays);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
