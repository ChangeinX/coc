# Clash of Clans Dashboard

This monorepo contains a Flask API and a React dashboard.

## Google Sign-In setup

The dashboard uses [Google Identity Services](https://developers.google.com/identity) for authentication. To run the app locally you must create an OAuth 2.0 **Web** client in the Google Cloud Console and configure it as follows:

1. Add `http://localhost:5173` to the **Authorized JavaScript origins**. This is the default Vite development server address.
2. Copy the generated client ID and set it in two environment variables:
   - `VITE_GOOGLE_CLIENT_ID` for the React dev server.
   - `GOOGLE_CLIENT_ID` for the Flask API.

Without the JavaScript origin entry Google will return a `redirect_uri_mismatch` error when attempting to sign in.

## Session configuration

The user service issues signed JWT cookies for authentication. Configure the following environment variables:

- `JWT_SIGNING_KEY` – HMAC key used to sign session tokens.
- `SESSION_MAX_AGE` – Lifetime of a session in seconds.
- `COOKIE_DOMAIN` – Domain attribute for the `sid` cookie.
- `COOKIE_SECURE` – Set to `false` to disable the `Secure` flag during local development.
These variables are generally injected from AWS Secrets Manager at runtime.

## Clash of Clans asset links

Clan and player records are stored exactly as returned by the [Clash of Clans API](https://developer.clashofclans.com/#/documentation). Icon URLs such as clan badges and league emblems can be read directly from the JSON data in the database. See the official documentation for the object schema and available image sizes.

