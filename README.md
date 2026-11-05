# Quote Rediscovery

Import the quotes you highlighted in ReadEra, browse them by book, and get one back every day as a notification.

Stack: Vue 3 + Vuetify (client), Express (server), MongoDB (database).

## Setup

```bash
# server
cd server
npm install
cp .env.example .env      # then edit .env
npm run vapid             # paste the two keys into .env
npm run dev

# client (new terminal)
cd client
npm install
npm run dev               # http://localhost:5173
```

Production: run `npm run build` in `client`, then `npm start` in `server`. The server serves the built app on its own port.

## Environment variables (`server/.env`)

| Variable | What to put |
| --- | --- |
| `MONGODB_URI` | Your MongoDB connection string |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | From `npm run vapid` |
| `VAPID_SUBJECT` | `mailto:` your email |
| `TIMEZONE` | Optional, e.g. `Asia/Kolkata` |
| `PORT` | Optional, default 3000 |

## MongoDB Atlas

1. Create a free cluster, then add a database user (Database Access).
2. Allow your IP (Network Access).
3. Connect > Drivers > copy the `mongodb+srv://...` string into `MONGODB_URI`, with your user, password and a database name (e.g. `/quote-rediscovery`).

## Notes

- Notifications need HTTPS (localhost is fine for development) and the server must be running at the chosen time.
- Re-importing a book adds only new quotes.
