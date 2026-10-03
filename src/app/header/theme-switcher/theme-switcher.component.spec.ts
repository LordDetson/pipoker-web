import {ComponentFixture, fakeAsync, TestBed, tick} from "@angular/core/testing";
import {ThemeService} from "ng2-charts";
import {Chart} from "chart.js";
import {ThemeSwitcherComponent} from "./theme-switcher.component";
import {AppConstants} from "../../common/app-constants";

describe("ThemeSwitcherComponent", () => {
  let fixture: ComponentFixture<ThemeSwitcherComponent>;
  let themeService: jasmine.SpyObj<ThemeService>;
  let initialTheme: string | null;

  beforeEach(() => {
    initialTheme = document.body.getAttribute("data-bs-theme");
    localStorage.clear();
    themeService = jasmine.createSpyObj<ThemeService>("ThemeService", ["setColorschemesOptions"]);
    TestBed.configureTestingModule({
      declarations: [ThemeSwitcherComponent],
      providers: [{provide: ThemeService, useValue: themeService}]
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.body.setAttribute("data-bs-theme", initialTheme ?? "dark");
    document.documentElement.style.removeProperty("--common-transition-duration");
  });

  function create(): void {
    fixture = TestBed.createComponent(ThemeSwitcherComponent);
    fixture.detectChanges();
  }

  function slider(): HTMLInputElement {
    return fixture.nativeElement.querySelector("#slider");
  }

  function datalabelsColor(): string {
    return (Chart.defaults.plugins as any).datalabels.color;
  }

  it("uses the dark theme by default", fakeAsync(() => {
    create();
    tick(10);

    expect(document.body.getAttribute("data-bs-theme")).toBe("dark");
    expect(datalabelsColor()).toBe("#ffffff");
    expect(themeService.setColorschemesOptions).toHaveBeenCalled();
    expect(document.documentElement.style.getPropertyValue("--common-transition-duration")).toBe("0.8s");
  }));

  it("restores the last chosen theme", fakeAsync(() => {
    localStorage.setItem(AppConstants.lastTheme, "true");
    create();
    tick(10);

    expect(document.body.getAttribute("data-bs-theme")).toBe("light");
    expect(slider().checked).toBeTrue();
    expect(datalabelsColor()).toBe("#343a40");
  }));

  it("switches the theme and remembers it", fakeAsync(() => {
    create();
    tick(10);

    slider().click();
    expect(document.body.getAttribute("data-bs-theme")).toBe("light");
    expect(localStorage.getItem(AppConstants.lastTheme)).toBe("true");

    slider().click();
    expect(document.body.getAttribute("data-bs-theme")).toBe("dark");
    expect(localStorage.getItem(AppConstants.lastTheme)).toBe("false");
  }));
});
