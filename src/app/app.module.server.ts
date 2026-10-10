import {NgModule, provideZoneChangeDetection} from "@angular/core";
import {provideServerRendering, withRoutes} from "@angular/ssr";
import {AppModule} from "./app.module";
import {AppComponent} from "./app.component";
import {serverRoutes} from "./app.routes.server";
import {BROWSER_LANGUAGES} from "./i18n/i18n.service";

// Bootstraps the application at build time to prerender the pages listed in serverRoutes
@NgModule({
  imports: [AppModule],
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // The same change detection as in the browser (see main.ts)
    provideZoneChangeDetection(),
    // The prerendered pages are in Russian, the language of most visitors and of the tags in index.html.
    // In the browser the application renders them again in the visitor's language.
    {provide: BROWSER_LANGUAGES, useValue: ["ru"]}
  ],
  bootstrap: [AppComponent]
})
export class AppServerModule {
}
