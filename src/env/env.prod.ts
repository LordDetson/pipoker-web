// The backend is served on the same domain as the web client (see the reverse proxy in pipoker-docker-config),
// so the same build works for every environment. The domain is read when an address is needed: the build
// prerenders the pages without a browser, where there is no domain yet.
export const environment = {
  production: true,
  profile: "prod",
  get wsUrl(): string {
    return window.location.origin + "/ws";
  },
  get apiUrl(): string {
    return window.location.origin + "/api";
  },
  get invitationUrl(): string {
    return window.location.origin + "/room/";
  },
  // The page where people can support the project; the header shows no support link while it is empty
  supportUrl: "https://lorddetson.github.io/"
};
