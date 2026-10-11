import {RenderMode, ServerRoute} from "@angular/ssr";

// The pages the build renders to HTML, so search engines that run no JavaScript still see what they say:
// the start page and the guide, at their addresses without a language (rendered in Russian) and in each language.
// A room exists only while its people are in it, so it is rendered in the browser.
export const serverRoutes: ServerRoute[] = [
  {path: "", renderMode: RenderMode.Prerender},
  {path: "ru", renderMode: RenderMode.Prerender},
  {path: "en", renderMode: RenderMode.Prerender},
  {path: "guide", renderMode: RenderMode.Prerender},
  {path: "ru/guide", renderMode: RenderMode.Prerender},
  {path: "en/guide", renderMode: RenderMode.Prerender},
  {path: "**", renderMode: RenderMode.Client}
];
