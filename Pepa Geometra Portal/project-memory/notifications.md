# Notifications

## Email Provider
- Provider: Brevo.
- Render env should include `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `APP_PUBLIC_URL`.
- The app setting `studioNotificationEmail` is the recipient for studio-side operational notifications, especially client document uploads.

## Required Flows
- Client creation: send onboarding/access email to the client's email address.
- Geometra document upload/update: send a document notification to the related client when the email flag is enabled and the document is visible to the client.
- Client requested-document upload: send a notification to the studio operational mailbox, not to the client and not necessarily to the first admin user.

## Debug Checklist
- Confirm notification row recipient before checking the mailbox.
- If a notification says `Inviata`, Brevo accepted the send; check spam/promotions and Brevo event logs.
- If a notification goes to the wrong recipient, check `app_settings.notifications.studioNotificationEmail`.
- For existing Supabase projects, run `supabase/fix_online_schema.sql` after changes that add settings or schema fields.

