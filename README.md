# VTS Community Chat

Professional community chat platform built with Next.js, Convex, and Clerk.

## Features

- Real-time channel messaging and thread replies
- Presence, typing indicators, and unread tracking
- Role-based access controls and admin moderation tools
- Polls, reputation, course content, and money request flows
- Email and webhook integrations (Resend)
- PWA support with push notifications

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Radix UI/shadcn
- Backend: Convex (database + server functions)
- Auth: Clerk
- Email: Resend

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` and set required environment variables:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=your_convex_url

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Resend (if using email features)
RESEND_API_KEY=your_resend_api_key
```

3. Start Convex dev backend:

```bash
npx convex dev
```

4. In a separate terminal, run the Next.js app:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Admin Setup

By default, new users are not admins.

1. Sign up/sign in.
2. Open your Convex dashboard and go to Data.
3. Find your user document in `users`.
4. Set `isAdmin` to `true`.
5. Refresh the app to access admin features.
