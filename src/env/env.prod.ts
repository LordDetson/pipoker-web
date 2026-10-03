// The backend is served on the same domain as the web client (see the reverse proxy in pipoker-docker-config),
// so the same build works for every environment.
export const environment = {
  production: true,
  profile: "prod",
  wsUrl: window.location.origin + "/ws",
  invitationUrl: window.location.origin + "/room/"
};
