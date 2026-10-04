/// <reference types="@angular/localize" />

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import {environment} from "./env/env";
import {enableProdMode, provideZoneChangeDetection} from "@angular/core";


// Angular is zoneless by default since version 21; the client still relies on zone.js to update the page
platformBrowserDynamic().bootstrapModule(AppModule, {applicationProviders: [provideZoneChangeDetection()]})
  .catch(err => console.error(err));

if (environment.production) {
  enableProdMode()
}
