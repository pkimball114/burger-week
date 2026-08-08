# Supabase Setup For Burger Week

The app stays static and GitHub Pages-compatible. Supabase is optional at runtime:

- If `config/supabase.js` has a valid project URL and public key, the app uses Supabase Auth, shared reviews, shared wants, private hidden burgers, and review photo Storage.
- If config is missing, blank, or invalid, the app falls back to the existing localStorage prototype.

Do not put a service role key or secret key in this repo. Use only the project URL and a public publishable/anon key.

## 1. Create Or Select A Supabase Project

Use the Supabase Dashboard and create/select a project. No project was created by Codex.

In the project, apply [docs/supabase-schema.sql](supabase-schema.sql) from the SQL editor only after you are ready. The schema:

- Enables RLS on all app tables.
- Stores profiles, shared reviews, wants, and hidden burger IDs.
- Creates a private `burger-review-photos` Storage bucket.
- Allows signed-in users to upload photos under their own user ID folder.
- Keeps `event_id` and `food_item_id` as text on social tables so your static CSV remains the source of burger data.

That last point matters: if you add rows to `data/burger-week-2026.csv` and push the static site, friends can review those new burger IDs without a database seed step. Keep `id` values stable once reviews exist.

## 2. Configure Auth URLs

In Supabase Dashboard:

```text
Authentication -> URL Configuration
```

Set:

```text
Site URL: https://pkimball114.github.io/burger-week/
```

Add redirect URLs:

```text
https://pkimball114.github.io/burger-week/
http://127.0.0.1:4180/
http://127.0.0.1:4298/
```

Use whichever fresh localhost port you are testing with. If you use a different port, add it too.

## 3. Choose How Private Login Should Be

The app uses email and password for Supabase Auth. Friends choose a display name in the app, but reviews/wants/hidden burgers are tied to their Supabase user ID so the display name can change later.

For a friend-only app:

1. Disable open signups in Supabase Auth settings.
2. Invite/create the allowed friend accounts from the Supabase Dashboard, or temporarily enable signups while your group creates accounts.
3. Have friends log in with email and password from the app.

Password reset still sends an email. Make sure the production URL and any fresh localhost test ports are listed in the Auth redirect URLs above.

## 4. Add Public Config

Edit [config/supabase.js](../config/supabase.js):

```js
window.BURGER_WEEK_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY",
  authMode: "supabase"
};
```

Use a publishable key if your project shows one. Older projects may show an `anon` key; that is acceptable for browser clients when RLS is enabled. Never use the service role key here.

## 5. Deploy Config And App

After editing config or static data:

```bash
git add app.js index.html styles.css sw.js config docs data assets README.md
git commit -m "Connect Supabase shared Burger Week data"
git push
```

GitHub Pages will deploy from the repo. Because `sw.js` precaches app files, bump `cacheName` whenever config, CSV, JS, or photo assets change.

## 6. Verify

Open:

```text
https://pkimball114.github.io/burger-week/
```

Expected behavior:

1. Click `Log In`.
2. Enter display name, email, and password.
3. Use `Create Account` for a new user, or `Log In` for an existing user.
4. The top-right auth button changes to your display name.
5. Add a review, optionally with a photo.
6. Open the site in another browser after logging in with another user: shared reviews and wants should appear.

If posting fails, check:

- `docs/supabase-schema.sql` was applied.
- The `burger-review-photos` bucket exists.
- RLS policies exist on `reviews`, `wants`, `hidden_food_items`, and `storage.objects`.
- Newer Supabase projects expose the tables to the Data API and grant access to `authenticated`.
- The live URL is in Auth redirect URLs.
