# Fiola landing page

A Russian-language landing page for the Fiola digital studio. It presents design and development services, project information, and a contact form. The form posts to `/api/telegram`, which requires a server-side endpoint and environment configuration.

## Run locally

```sh
npm install
npm run dev
```

Use `npm run build` to create the production bundle. Do not put Telegram credentials in frontend code.
