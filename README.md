# Clash of Clans Dashboard

This monorepo contains a Flask API, a data sync service and a React dashboard.

## Google Sign-In setup

The dashboard uses [Google Identity Services](https://developers.google.com/identity) for authentication. To run the app locally you must create an OAuth 2.0 **Web** client in the Google Cloud Console and configure it as follows:

1. Add `http://localhost:5173` to the **Authorized JavaScript origins**. This is the default Vite development server address.
2. Copy the generated client ID and set it in two environment variables:
   - `VITE_GOOGLE_CLIENT_ID` for the React dev server.
   - `GOOGLE_CLIENT_ID` for the Flask API.

Without the JavaScript origin entry Google will return a `redirect_uri_mismatch` error when attempting to sign in.

## Clash of Clans asset links

Clan and player records are stored exactly as returned by the [Clash of Clans API](https://developer.clashofclans.com/#/documentation). Icon URLs such as clan badges and league emblems can be read directly from the JSON data in the database. See the official documentation for the object schema and available image sizes.

This project now uses the [coc.py](https://cocpy.readthedocs.io/) client library for all Clash of Clans API access.

