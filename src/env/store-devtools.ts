import {StoreDevtoolsModule} from "@ngrx/store-devtools";

// Connects the store to Redux DevTools in development builds; the production build replaces this file
export const storeDevtools = [StoreDevtoolsModule.instrument({maxAge: 25, connectInZone: true})];
