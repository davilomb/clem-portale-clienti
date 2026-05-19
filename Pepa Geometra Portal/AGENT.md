# InBolla Project Memory

## Product Direction
- InBolla is a client portal for a surveying/technical studio. The public-facing customer side is read-only except for explicit document-upload requests created by the studio.
- The geometra backend is the operational source of truth: projects, clients, documents, folders, timeline items, requests, notifications, users and settings are managed there.
- The UX should feel like a simple operational dashboard, not a marketing site. Desktop comes first; mobile can follow later.

## Deployment
- Demo portal: Render, `https://inbolla.onrender.com/`.
- Render root directory: `Pepa Geometra Portal`.
- Render build command: `echo "No build required"`.
- Render start command: `node server.js`.
- Vetrina/site and demo are separated by platform/branch configuration. Do not change deployment structure without checking the intended target.

## Data And Services
- Supabase stores structured data and project documents.
- Brevo is the current email provider.
- WhatsApp/SMS remains a future integration and should stay present as UI/settings flags without sending messages.
- Operational studio notifications for client-uploaded documents must go to the configurable notification setting `studioNotificationEmail`, not blindly to the first admin user.

## UX Rules
- Client portal: document folders and files are central, read-only, and organized by project and category. Client can upload only when a specific request asks for a document.
- Geometra portal: editing/creation actions should open in popups from contextual CTAs, keeping the main page readable.
- Document management must be top-down: client -> project -> folder/category -> file.
- Uploaded client documents are part of the corresponding client/project context and must be reviewable, editable, status-changeable and deletable by the geometra.
- Visibility labels should say whether an item is visible to the client or hidden/internal, not generic labels like "Vista".

## Current Notification Behaviors
- New client/user access should email credentials to the client when enabled.
- New or updated project documents can notify the related client by email.
- When a client uploads a requested document, the studio receives an email notification at `studioNotificationEmail`.

