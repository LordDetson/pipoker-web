import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterLink} from "@angular/router";
import {Subscription} from "rxjs";
import {GUIDE, GuideContent} from "./guide-content";
import {I18nService} from "../i18n/i18n.service";
import {PageMetaService} from "../services/page-meta.service";
import {VisitService} from "../services/visit.service";

// The guide "How to run Planning Poker" at /guide: what the game is, the decks, the meeting step by step with
// the way each step is done in PiPoker, and common mistakes. It is the page search engines find for questions
// about Planning Poker, so it carries its own title and description. Loaded only when opened, so its texts and
// screenshots stay out of the start page's bundle.
@Component({
  selector: "app-guide",
  templateUrl: "./guide.component.html",
  styleUrls: ["./guide.component.css"],
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class GuideComponent implements OnInit, OnDestroy {

  private languageSubscription: Subscription;

  constructor(private i18n: I18nService, private pageMeta: PageMetaService, private visits: VisitService) {
  }

  get content(): GuideContent {
    return GUIDE[this.i18n.language];
  }

  imageUrl(file: string): string {
    return `/assets/guide/${this.i18n.language}/${file}`;
  }

  ngOnInit(): void {
    this.visits.report();
    this.languageSubscription = this.i18n.language$.subscribe(() => {
      const {title, description} = this.content;
      this.pageMeta.set({title, description, path: "/guide"});
    });
  }

  ngOnDestroy(): void {
    this.languageSubscription.unsubscribe();
    this.pageMeta.reset(this.i18n.translate("meta.description"));
  }
}
