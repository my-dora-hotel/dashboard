# Dashboard - My Dora Operations System

A comprehensive operations and management system designed for Hotel My Dora.

## Modules

### Accounting (Muhasebe)
- **Receivables & Payables Tracking**: Easily manage all receivable and payable records
- **Category Management**: Create categories based on official accounting codes
- **Account Management**: Create accounts linked to categories
- **Ledger Entries**: Add entries with date, category, account, description, and amount
- **Draft System**: Auto-save drafts while creating entries, resume editing anytime
- **Account Balance Preview**: Real-time balance preview showing current balance, pending changes, and final balance
- **Filtering**: Filter by date range, category, and account
- **Grouping**: Group view by category with automatic totals
- **Keyboard Navigation**: Navigate between rows using arrow keys

### More modules coming soon...

## Features

- **Authentication**: Secure login with Supabase Auth
- **Modern UI**: Clean and responsive interface built with shadcn/ui
- **Real-time Data**: Powered by Supabase
- **Draft Auto-save**: Automatically save work-in-progress entries as drafts
- **Balance Preview**: See account balance changes before saving entries
- **Keyboard Navigation**: Efficient navigation with arrow keys and Tab

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: TailwindCSS 4, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Supabase Configuration

1. Create a [Supabase](https://supabase.com) account
2. Create a new project
3. Run the SQL commands from `supabase/schema.sql` in the Supabase SQL Editor
4. Create a `.env.local` file with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Create User

Create a new user from Supabase Dashboard > Authentication > Users.

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Categories
- `id` (VARCHAR): Accounting code (e.g., "102")
- `name` (VARCHAR): Category name
- `created_at`, `updated_at`: Timestamps

### Accounts
- `id` (UUID): Unique identifier
- `category_id` (VARCHAR): Linked category
- `name` (VARCHAR): Account name
- `description` (TEXT): Description
- `created_at`, `updated_at`: Timestamps

### Ledger Entries
- `id` (UUID): Unique identifier
- `date` (DATE): Transaction date
- `category_id` (VARCHAR): Category
- `account_id` (UUID): Account
- `statement` (TEXT): Description
- `receivable` (DOUBLE): Receivable amount
- `debt` (DOUBLE): Payable amount
- `created_at`, `updated_at`: Timestamps

### Ledger Drafts
- `id` (UUID): Unique identifier
- `date` (DATE): Draft transaction date
- `entries` (JSONB): Array of entry rows (account_id, category_id, statement, type, amount)
- `created_at`, `updated_at`: Timestamps

## License

This project is developed exclusively for Hotel My Dora.
