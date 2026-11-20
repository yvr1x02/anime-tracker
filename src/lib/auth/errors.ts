/** Our server answered 401: no session, or AniList refused the token and the server ended it. */
export class NotLoggedInError extends Error {
  constructor() {
    super("Not logged in");
    this.name = "NotLoggedInError";
  }
}
