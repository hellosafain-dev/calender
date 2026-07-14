# Vercel & Supabase Environment Configuration Guide

If you see the **"Garden Server Offline"** screen on your deployed Vercel site, it means the serverless functions cannot connect to your Supabase database. 

Here is exactly how to resolve this.

---

## Part 1: Your Vercel Environment Keys List
Copy these key names and paste them into your **Vercel Project Dashboard** (under Settings → Environment Variables):

| Key Name | Value Source | Example Value |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google AI Studio | `AIzaSy...` |
| `SUPABASE_URL` | Supabase Dashboard (Settings -> API) | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Dashboard (Settings -> API) | `eyJhbGciOi...` (anon public) |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard (Settings -> API) | `eyJhbGciOi...` (service_role secret) |
| `JWT_SECRET` | Generate random string | *Any strong random characters (min 32 chars)* |

---

## Part 2: Step-by-Step Fixes

### 1. Set up the Database Tables in Supabase
The backend looks for tables named `settings`, `memories`, and `reminders`. If they don't exist, the backend fails and triggers the "Offline" screen.
*   Go to **[Supabase Dashboard](https://supabase.com/dashboard)** → Select your project.
*   Click on **SQL Editor** on the left menu (represented by `SQL` icon).
*   Click **New Query**.
*   Open the file [`supabase-schema.sql`](file:///c:/Users/User/Downloads/bloom-diary/supabase-schema.sql) in this project, copy its entire contents, and paste it into the Supabase SQL editor.
*   Click **Run** (bottom right). You should see `Success`.

### 2. Set up the Photo Storage Bucket
The photo upload handler needs a bucket named `photos` to upload files to.
*   Go to the **Storage** tab on the left menu.
*   Click **New Bucket**.
*   Name it exactly **`photos`**.
*   Make sure you toggle **Public** to `ON` so photos can be viewed.
*   Click **Save**.

### 3. Add Environment Variables in Vercel
*   Go to **[Vercel Dashboard](https://vercel.com)** → Click on your `calender` project.
*   Click on **Settings** (top tab) → **Environment Variables** (left menu).
*   Add each of the 5 keys from the table above.
*   *Note: Make sure to copy the `service_role` key for `SUPABASE_SERVICE_KEY`, NOT the anon public key.*

### 4. Redeploy
*   Once the environment variables are added, go to the **Deployments** tab in Vercel.
*   Click on the **⋮** button next to your latest deployment and select **Redeploy** (make sure "Use existing Build Cache" is unchecked so it reloads the environment variables).

---

Once redeployed, refresh the browser page. The screen will load the calendar instantly!
