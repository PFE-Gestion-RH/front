import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IReportEmbedConfiguration, models } from 'powerbi-client';
import { PowerBIEmbedModule } from 'powerbi-client-angular';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  imports: [PowerBIEmbedModule]
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('wrapper', { static: false }) wrapperRef!: ElementRef<HTMLDivElement>;

  reportConfig: IReportEmbedConfiguration = {
    type: 'report',
    embedUrl: undefined,
    accessToken: undefined,
    tokenType: models.TokenType.Embed,
    settings: {
      panes: {
        filters: { visible: false },
        pageNavigation: { visible: false }
      },
      layoutType: models.LayoutType.Master,
      customLayout: {
        displayOption: models.DisplayOption.FitToWidth
      }
    }
  };

  isLoaded = false;
  showReport = true;
  errorMessage = '';

  private resizeObserver?: ResizeObserver;
  private resizeTimer?: any;
  private currentLayout: models.LayoutType = models.LayoutType.Master;
  private embedData: any = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    const initialWidth = window.innerWidth;
    const initialLayout = initialWidth < 768
      ? models.LayoutType.MobilePortrait
      : models.LayoutType.Master;
    this.currentLayout = initialLayout;

    console.log('[PBI] initial window.innerWidth =', initialWidth, '→ layout =', initialLayout);

    this.http.get<any>('http://localhost:5000/api/powerbi/embed-config').subscribe({
      next: (data) => {
        this.embedData = data;
        setTimeout(() => {
          const availableWidth = this.wrapperRef?.nativeElement?.offsetWidth || (window.innerWidth - 180);
          console.log('[PBI] availableWidth =', availableWidth);
          this.buildConfig(initialLayout);
          this.isLoaded = true;
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (err) => {
        this.errorMessage = 'Erreur chargement rapport Power BI';
        console.error(err);
      }
    });
  }

  private buildConfig(layout: models.LayoutType): void {
    if (!this.embedData) return;
    this.reportConfig = {
      type: 'report',
      tokenType: models.TokenType.Embed,
      embedUrl: this.embedData.embedUrl,
      accessToken: this.embedData.embedToken,
      id: this.embedData.reportId,
      settings: {
        panes: {
          filters: { visible: false },
          pageNavigation: { visible: false }
        },
        layoutType: layout,
        customLayout: {
          displayOption: models.DisplayOption.FitToWidth
        }
      }
    };
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.setupResizeObserver();
      // Force recalcul après rendu complet
      setTimeout(() => {
        if (this.embedData) {
          this.showReport = false;
          this.cdr.detectChanges();
          setTimeout(() => {
            this.buildConfig(this.currentLayout);
            this.showReport = true;
            this.cdr.detectChanges();
          }, 100);
        }
      }, 1000);
    }, 1000);
  }

  private setupResizeObserver(): void {
    if (!this.wrapperRef?.nativeElement) {
      setTimeout(() => this.setupResizeObserver(), 300);
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.updateLayoutIfNeeded(), 300);
    });

    this.resizeObserver.observe(this.wrapperRef.nativeElement);
    console.log('[PBI] ResizeObserver attaché');
  }

  private updateLayoutIfNeeded(): void {
    if (!this.wrapperRef?.nativeElement) return;

    const width = this.wrapperRef.nativeElement.clientWidth;
    const newLayout = width < 768
      ? models.LayoutType.MobilePortrait
      : models.LayoutType.Master;

    console.log('[PBI] resize detected, width =', width, '→ layout =', newLayout);

    if (newLayout === this.currentLayout) return;

    this.currentLayout = newLayout;

    this.showReport = false;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.buildConfig(newLayout);
      this.showReport = true;
      this.cdr.detectChanges();
      console.log('[PBI] composant recréé avec layout', newLayout);
    }, 50);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    clearTimeout(this.resizeTimer);
  }
}