# Luma -- Hotel My Dora Accounting & Cashflow System

## Product Requirements & Technical Specification (Cursor-Ready)

## 1. Overview

Luma is a minimal accounting / cashflow tracking system designed for
**Hotel My Dora**.

The goal is NOT full bookkeeping or invoicing.

Luma focuses purely on:

-   Tracking Receivables (Alacak)
-   Tracking Debts (Borç)
-   Viewing totals
-   Filtering by date & category
-   Grouped summaries

It behaves like a simplified ledger.

Users define: - Categories (official accounting codes) - Accounts under
categories

Then record ledger entries with: - Date - Category - Account - Amount
(either receivable or debt) - Optional statement

System calculates totals and grouped summaries.

This system includes **authentication** and **multiple users**, but **no
role-based access control** is required (all users can be considered
admin).

------------------------------------------------------------------------

## 2. Core Entities (Data Model)

### 2.1 User (Auth)

Authentication is handled by **Supabase Auth**.

Assumptions: - Email + password login is sufficient for MVP. - All
authenticated users can access all data (no ACL / no role filtering).

------------------------------------------------------------------------

### 2.2 Category

Represents accounting categories using official Turkish / international
codes.

Example: - 102 → Bank

Fields:

-   id: string (category code, e.g. "102") **PRIMARY KEY**
-   name: string
-   created_at: timestamp
-   updated_at: timestamp

Rules: - id must be unique (user enters it) - id represents official
accounting code - Categories can be created, edited, deleted - Deleting
a category triggers cascade delete: - All related accounts - All ledger
entries belonging to those accounts

Deletion UX must show destructive confirmation:

"You are about to delete this category.\
This will permanently remove all related accounts and ledger entries.\
This action cannot be undone."

User must explicitly confirm.

------------------------------------------------------------------------

### 2.3 Account

Accounts belong to categories.

Fields:

-   id: uuid **PRIMARY KEY**
-   category_id: string (FK → categories.id)
-   name: string
-   description: string (nullable)
-   created_at: timestamp
-   updated_at: timestamp

Rules: - unlimited accounts per category - category selected via
searchable dropdown - Accounts can be created, edited, deleted -
Deleting an account triggers cascade delete: - All ledger entries for
that account

Account deletion requires confirmation.

------------------------------------------------------------------------

### 2.4 Ledger Entry (Transaction Line)

Main operational table.

Fields:

-   id: uuid **PRIMARY KEY**
-   date: date
-   category_id: string (FK → categories.id)
-   account_id: uuid (FK → accounts.id)
-   statement: text (nullable)
-   receivable: double precision (default 0.0)
-   debt: double precision (default 0.0)
-   created_at: timestamp
-   updated_at: timestamp

Rules: - Either receivable OR debt can be \> 0 (not both) - Must belong
to valid category + account - Monetary values use double precision -
Entries can be created, edited, deleted

------------------------------------------------------------------------

## 3. Functional Requirements

### 3.1 Authentication

-   Login page (email + password)
-   Logout
-   Session persistence
-   Protected routes: Luma requires authentication to access any page

No user roles / permissions logic.

------------------------------------------------------------------------

### 3.2 Category Management

User can:

-   Create category
-   View categories
-   Edit category name (code immutable in MVP)
-   Delete category (destructive confirmation required)

Deletion behavior: - Deletes all related accounts - Deletes all related
ledger entries

------------------------------------------------------------------------

### 3.3 Account Management

User can:

-   Create account
-   Select category via searchable dropdown
-   Enter account name
-   Optional description
-   Edit account
-   Delete account

------------------------------------------------------------------------

### 3.4 Ledger Page

User can add, edit, delete entries with date, category, account,
statement, receivable or debt.

------------------------------------------------------------------------

### 3.5 Filtering

Date range and category filtering.

------------------------------------------------------------------------

### 3.6 Grouping & Totals

Grouped by category with totals per group and global totals.

------------------------------------------------------------------------

## 4. UI

-   React + TypeScript
-   Node.js
-   TailwindCSS
-   shadcn/ui - Documentation: https://ui.shadcn.com/docs

Layouts must be stack-based. And all UI components must be used from shadcn.

------------------------------------------------------------------------

## 5. Backend

Supabase (Postgres + Auth). No Prisma.

------------------------------------------------------------------------

## 6. Coding Guidelines

### 6.1 UI Components

**shadcn/ui Documentation:** https://ui.shadcn.com/docs

- **Always use shadcn/ui components** - Never create custom UI components when shadcn provides an equivalent
- **Never customize component internals** - Use components as-is from shadcn
- **Follow shadcn documentation** - When implementing features, always check shadcn docs for the recommended approach
- **No hacky solutions** - Avoid CSS hacks or workarounds; use proper component props and patterns
- **Extend components properly** - If a shadcn component needs additional functionality, extend it by adding props (e.g., `stickyHeader` prop for Table)

### 6.2 Code Quality

- **Keep it simple** - Prefer simple, readable code over clever solutions
- **TypeScript strict mode** - Use proper types, avoid `any`
- **Component composition** - Build complex UIs by composing smaller components

### 6.3 Styling

- **TailwindCSS only** - No custom CSS files
- **Responsive design** - All layouts must work on mobile and desktop
- **Consistent spacing** - Use Tailwind's spacing scale consistently

### 6.4 Data Fetching

- **Use Supabase client** - All data operations through Supabase JS client
- **Handle loading states** - Show loading indicators during data fetches
- **Handle errors gracefully** - Display user-friendly error messages via toast

------------------------------------------------------------------------

End of Specification
