This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Delivery (COD) Integration

Sale receipts can be created with Delivery (Cash on Delivery) using two providers: Optimus and Sabeq Laheq. Delivery tracking data is saved in the same `Receipt` model under `delivery`.

Environment variables:

- `DELIVERY_CRON_SECRET` — secret token used by the HTTP cron sync endpoint
- `OPTIMUS_API_URL` — base URL for Optimus API
- `OPTIMUS_API_TOKEN` — bearer token for Optimus API
- `SABEQLAHEQ_API_URL` — base URL for Sabeq Laheq API
- `SABEQLAHEQ_API_TOKEN` — bearer token for Sabeq Laheq API

HTTP cron (every 6 hours recommended):

- Endpoint: `/api/delivery/sync?secret=YOUR_SECRET`
- Method: GET
- Purpose: polls courier systems for all in-flight delivery receipts and updates status/history. When COD is collected, the system auto-adds the remaining due as a `cod` payment and sets status to `payment_collected`.

Status journey for delivery sales: `on_delivery` → `payment_collected` → `ready_to_receive` → `completed`.
