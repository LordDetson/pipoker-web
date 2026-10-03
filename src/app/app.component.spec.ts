import {TestBed} from "@angular/core/testing";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {AppComponent} from "./app.component";

describe("AppComponent", () => {
  let ngbModal: jasmine.SpyObj<NgbModal>;

  beforeEach(() => {
    ngbModal = jasmine.createSpyObj<NgbModal>("NgbModal", ["open"]);
    TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [{provide: NgbModal, useValue: ngbModal}],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  it("renders the header above the routed page", () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(Array.from(element.children).map(child => child.tagName.toLowerCase())).toEqual(["app-header", "router-outlet"]);
  });

  it("opens modals", () => {
    const fixture = TestBed.createComponent(AppComponent);

    fixture.componentInstance.open("content");

    expect(ngbModal.open).toHaveBeenCalledWith("content");
  });
});
