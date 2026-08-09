#!/bin/sh
set -eu

required_vars="SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF RESEND_API_KEY SMTP_ADMIN_EMAIL"

for var_name in $required_vars; do
  eval "var_value=\${$var_name:-}"
  if [ -z "$var_value" ]; then
    echo "Missing required environment variable: $var_name" >&2
    exit 1
  fi
done

SMTP_SENDER_NAME="${SMTP_SENDER_NAME:-Burger Week}"
SMTP_HOST="${SMTP_HOST:-smtp.resend.com}"
SMTP_PORT="${SMTP_PORT:-465}"
SMTP_USER="${SMTP_USER:-resend}"
export SMTP_SENDER_NAME SMTP_HOST SMTP_PORT SMTP_USER

payload=$(
  node -e '
    const payload = {
      external_email_enabled: true,
      mailer_secure_email_change_enabled: true,
      mailer_autoconfirm: false,
      smtp_admin_email: process.env.SMTP_ADMIN_EMAIL,
      smtp_host: process.env.SMTP_HOST,
      smtp_port: Number(process.env.SMTP_PORT),
      smtp_user: process.env.SMTP_USER,
      smtp_pass: process.env.RESEND_API_KEY,
      smtp_sender_name: process.env.SMTP_SENDER_NAME
    };
    process.stdout.write(JSON.stringify(payload));
  '
)

curl -fsS -X PATCH "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$payload"

printf "\nResend SMTP configuration submitted for Supabase project %s.\n" "$SUPABASE_PROJECT_REF"
