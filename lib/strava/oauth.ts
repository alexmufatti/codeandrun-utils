// Shared by the connect and callback routes of the Strava OAuth flow.

// Holds the random `state` sent to Strava; the callback must receive the same
// value back, which proves the flow was started from this browser session.
export const STRAVA_STATE_COOKIE = "strava_oauth_state";

// The athlete can untick scopes on Strava's consent screen; without this one
// the activity sync cannot read anything.
export const STRAVA_REQUIRED_SCOPE = "activity:read_all";

export const STRAVA_SCOPES = `read,${STRAVA_REQUIRED_SCOPE}`;
