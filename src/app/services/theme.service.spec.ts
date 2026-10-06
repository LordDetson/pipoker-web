import {TestBed} from "@angular/core/testing";
import {ThemeService} from "./theme.service";
import {AppConstants} from "../common/app-constants";

describe("ThemeService", () => {
  let themeColor: HTMLMetaElement;

  beforeEach(() => {
    localStorage.removeItem(AppConstants.lastTheme);
    themeColor = document.createElement("meta");
    themeColor.name = "theme-color";
    themeColor.content = "#212529";
    document.head.appendChild(themeColor);
  });

  afterEach(() => {
    themeColor.remove();
    localStorage.removeItem(AppConstants.lastTheme);
    document.body.setAttribute("data-bs-theme", "dark");
  });

  it("starts dark with a dark title bar", () => {
    TestBed.inject(ThemeService);

    expect(document.body.getAttribute("data-bs-theme")).toBe("dark");
    expect(themeColor.content).toBe("#212529");
  });

  it("starts with the theme chosen last time", () => {
    localStorage.setItem(AppConstants.lastTheme, "true");

    TestBed.inject(ThemeService);

    expect(document.body.getAttribute("data-bs-theme")).toBe("light");
    expect(themeColor.content).toBe("#ffffff");
  });

  it("switches the page and the title bar of the installed app together", () => {
    const theme = TestBed.inject(ThemeService);

    theme.toggle();
    expect(document.body.getAttribute("data-bs-theme")).toBe("light");
    expect(themeColor.content).toBe("#ffffff");
    expect(localStorage.getItem(AppConstants.lastTheme)).toBe("true");

    theme.toggle();
    expect(document.body.getAttribute("data-bs-theme")).toBe("dark");
    expect(themeColor.content).toBe("#212529");
  });
});
