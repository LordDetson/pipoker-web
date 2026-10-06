import {Injector} from "@angular/core";

// Opens the feedback form. Its code is loaded on the first click, not with the site: few people ever need it.
export async function openFeedback(injector: Injector): Promise<void> {
  const {showFeedbackForm} = await import("./feedback.component");
  showFeedbackForm(injector);
}
