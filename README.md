# Professional Community Chat

This is a professional community chat application built with Next.js 14, Convex, Clerk, and Tailwind CSS.

## Features

- **Real-time Messaging**: Powered by Convecc.
- **Authentication**: Secure sign-in/sign-up via Clerk.
- **Admin Panel**: Manage users and channels (Admin only).
- **Responsive Design**: Mobile-optimized with a drawer navigation.
- **Role-based Access Control**: Admins can manage the community.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Set up Environment Variables**:
    Create a `.env.local` file with your Clerk and Convex keys:
    ```env
    NEXT_PUBLIC_CONVEX_URL=your_convex_url
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
    CLERK_SECRET_KEY=your_clerk_secret
    ```

3.  **Run Convex**:
    ```bash
    npx convex dev
    ```

4.  **Run the Application**:
    ```bash
    npm run dev
    ```

## Admin Setup

By default, new users are not admins. To become an admin:
1.  Sign up/Sign in to the app.
2.  Go to your Convex dashboard > Data.
3.  Find your user record in the `users` table.
4.  Manually set `isAdmin` to `true`.
5.  Refresh the app, and you will see the "Admin Panel" option in the user menu.

## Tech Stack

-   **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
-   **Backend**: Convex (Real-time DB + Functions)
-   **Auth**: Clerk
