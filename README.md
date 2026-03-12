# Recruiting App

A modern recruiting and hiring management application built with **Next.js** (App Router), **Tailwind CSS**, **Supabase**, and **Clerk**.

## Tech Stack

- **Next.js 15** – App Router, React 19, Turbopack
- **Tailwind CSS** – Styling
- **Supabase** – Database and backend
- **Clerk** – Authentication
- **Lucide React** – Icons

## Getting Started

1. **Install Node.js** (LTS) from [nodejs.org](https://nodejs.org) if you haven’t already.
2. **Install dependencies:**
   ```bash
   cd recruiting-app
   npm install
   ```
3. **Run the development server:**
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
recruiting-app/
├── app/              # App Router routes, layouts, and pages
├── components/       # Reusable UI components
├── public/           # Static assets
└── ...config files
```

## Core Features

### 1. Commercial Role Pipeline

Manage the full hiring pipeline for commercial roles (sales, business development, etc.). Track candidates from application through offer, with stages such as Applied, Screen, Interview, Offer, and Hired. View and move candidates between stages in a board or list view.

### 2. Role Tiles

Visual “tiles” or cards for each open role. Each tile shows key info (title, department, hiring manager, candidate count, status) and links to the role’s pipeline. Use tiles on dashboards and role lists for quick scanning and navigation.

### 3. Historical Reporting

Reporting and analytics on past hiring: time-to-fill, source effectiveness, pipeline conversion by stage, and diversity metrics. Use reports to improve process and plan capacity.

### 4. Permissions

Role-based access so only the right people see and do the right things. Control who can view pipelines, edit roles, see reports, and manage settings. Supports roles such as Admin, Hiring Manager, Recruiter, and Viewer.

### 5. Spark Hire Integration

Integration with [Spark Hire](https://www.sparkhire.com/) for video interviews. Sync candidates and roles, send one-way or live video interview links from the app, and optionally pull completion status or scores back into the pipeline.

### 6. Slack Feedback Bot

A Slack bot that lets interviewers and hiring managers submit structured feedback (e.g. score, notes, recommend/decline) from Slack. Feedback is stored and shown in the candidate’s profile and pipeline so decisions stay in one place.

---

## Environment Variables

Create a `.env.local` file in the project root when you’re ready to connect services:

- **Clerk:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never commit `.env.local`; it’s listed in `.gitignore`.

## Scripts

| Command      | Description                |
|-------------|----------------------------|
| `npm run dev`   | Start dev server (Turbopack) |
| `npm run build` | Build for production        |
| `npm run start` | Start production server     |
| `npm run lint`  | Run ESLint                  |
