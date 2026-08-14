# Supabase Setup For Burger Week

The app stays static and GitHub Pages-compatible. Supabase is optional at runtime:

- If `config/supabase.js` has a valid project URL and public key, the app uses Supabase Auth, shared reviews, shared wants, private hidden burgers, feedback reports, and review photo Storage.
- If config is missing, blank, or invalid, the app falls back to the existing localStorage prototype.

Do not put a service role key or secret key in this repo. Use only the project URL and a public publishable/anon key.

## 1. Create Or Select A Supabase Project

Use the Supabase Dashboard and create/select a project. No project was created by Codex.

In the project, apply [docs/supabase-schema.sql](supabase-schema.sql) from the SQL editor only after you are ready. The schema:

- Enables RLS on all app tables.
- Stores profiles, shared reviews, wants, hidden burger IDs, and app feedback reports.
- Creates a private `burger-review-photos` Storage bucket.
- Allows signed-in users to upload photos under their own user ID folder.
- Keeps `event_id` and `food_item_id` as text on social tables so your static CSV remains the source of burger data.

That last point matters: if you add rows to `data/burger-week-2026.csv` and push the static site, friends can review those new burger IDs without a database seed step. Keep `id` values stable once reviews exist.

If you already applied the main schema before feedback reporting was added, apply [docs/supabase-feedback-reports-migration.sql](supabase-feedback-reports-migration.sql). The app only inserts feedback reports; there is no client-side report viewer. Query `public.feedback_reports` directly from Supabase when you want to review bug reports and feature requests.

If you already applied the main schema before the hidden manual review score was added, apply [docs/supabase-review-boob-migration.sql](supabase-review-boob-migration.sql). The app never inserts or updates `reviews.boob`; manually set integer values in Supabase when you want reviews to appear under the "Most boob" sort.

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

Make sure the production URL and any fresh localhost test ports are listed in the Auth redirect URLs above.

## 4. Choose An Auth Email Path

For the current no-domain, low-cost setup, disable email confirmation in Supabase:

```text
Authentication -> Sign In / Providers -> Email -> Confirm Email: off
```

With email confirmation off, new accounts are implicitly confirmed at signup and the app avoids sending signup confirmation emails. Keep signups controlled by disabling open signups after your friends have accounts, or by manually creating accounts in Supabase.

This budget path has one tradeoff: password reset, invitation, magic link, and email change flows still require Auth email delivery. If those become important, use custom SMTP with a verified sender domain.

Supabase's default Auth email provider is only for early testing and has low, changeable rate limits. If you later buy or already control a domain, configure Resend as the project's custom SMTP provider in Supabase. Do not put the Resend API key in `app.js`, `config/supabase.js`, or any GitHub Pages asset.

In Resend:

1. Verify a sending domain you control.
2. Keep the Burger Week Resend API key private. Use it as the SMTP password.

In Supabase Dashboard:

```text
Authentication -> Email -> SMTP Settings
```

Enable custom SMTP and use:

```text
Sender email: no-reply@YOUR-VERIFIED-DOMAIN
Sender name: Burger Week
Host: smtp.resend.com
Port: 465
Username: resend
Password: YOUR_RESEND_API_KEY
```

You can also apply the same settings through the Supabase Management API without writing secrets to the repo:

```bash
export SUPABASE_ACCESS_TOKEN="YOUR_SUPABASE_ACCESS_TOKEN"
export SUPABASE_PROJECT_REF="lqczbhbkowcjjnjtrjjw"
export RESEND_API_KEY="YOUR_RESEND_API_KEY"
export SMTP_ADMIN_EMAIL="no-reply@YOUR-VERIFIED-DOMAIN"
export SMTP_SENDER_NAME="Burger Week"
sh scripts/configure-resend-smtp.sh
```

After saving, Supabase Auth sends confirmation, invitation, password reset, magic link, and email change emails through Resend instead of the default Supabase provider.

## 5. Add Public Config

Edit [config/supabase.js](../config/supabase.js):

```js
window.BURGER_WEEK_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY",
  authMode: "supabase"
};
```

Use a publishable key if your project shows one. Older projects may show an `anon` key; that is acceptable for browser clients when RLS is enabled. Never use the service role key here.

## 6. Deploy Config And App

After editing config or static data:

```bash
git add app.js index.html styles.css sw.js config docs data assets README.md
git commit -m "Connect Supabase shared Burger Week data"
git push
```

GitHub Pages will deploy from the repo. Because `sw.js` precaches app files, bump `cacheName` whenever config, CSV, JS, or photo assets change.

## 7. Verify

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
- RLS and an insert grant exist on `feedback_reports`.
- Newer Supabase projects expose the tables to the Data API and grant access to `authenticated`.
- The live URL is in Auth redirect URLs.
