-- More Simple Tax — Supabase schema + seed
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> Run

-- ── PROFILES ──────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  subscription_tier text default 'free' check (subscription_tier in ('free','basic','pro','premium')),
  onboarding_done boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, onboarding_done, subscription_tier)
  values (new.id, new.raw_user_meta_data ->> 'full_name', false, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── STRATEGIES ────────────────────────────────────────────
create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  calc_type text unique not null,
  title text not null,
  description text,
  potential_savings_low numeric default 0,
  potential_savings_high numeric default 0,
  difficulty text default 'Easy',
  setup_time_minutes int default 15,
  min_tier text default 'basic' check (min_tier in ('free','basic','pro','premium')),
  deadline text,
  display_order int default 0,
  created_at timestamptz default now()
);

alter table public.strategies enable row level security;

drop policy if exists "Authenticated users can view strategies" on public.strategies;
create policy "Authenticated users can view strategies" on public.strategies
  for select using (auth.role() = 'authenticated');

-- ── USER_STRATEGIES ───────────────────────────────────────
create table if not exists public.user_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  strategy_id uuid references public.strategies(id) on delete cascade,
  status text default 'eligible' check (status in ('eligible','in_progress','complete')),
  calculated_savings numeric default 0,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, strategy_id)
);

alter table public.user_strategies enable row level security;

drop policy if exists "Users manage own strategy progress" on public.user_strategies;
create policy "Users manage own strategy progress" on public.user_strategies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── SEED 10 STRATEGIES ────────────────────────────────────
insert into public.strategies (calc_type, title, description, potential_savings_low, potential_savings_high, difficulty, setup_time_minutes, min_tier, deadline, display_order)
values
  ('scorp', 'Elect S-Corp Status', 'Split your income into salary + distributions to slash self-employment tax.', 8000, 25000, 'Moderate', 45, 'pro', 'Mar 15', 1),
  ('solo401k', 'Solo 401(k)', 'Shelter more self-employment income from tax with employee + employer contributions.', 5000, 18000, 'Easy', 20, 'basic', null, 2),
  ('qbi', 'QBI Deduction (Section 199A)', 'Deduct up to 20% of qualified business income if you qualify.', 3000, 15000, 'Moderate', 20, 'basic', null, 3),
  ('home_office', 'Home Office Deduction', 'Deduct a portion of your home costs based on business-use square footage.', 800, 4500, 'Easy', 10, 'basic', null, 4),
  ('vehicle', 'Vehicle Deduction', 'Deduct business mileage or actual vehicle expenses, whichever is bigger.', 1500, 7000, 'Easy', 15, 'basic', null, 5),
  ('hsa', 'HSA Max Contribution', 'Triple tax-advantaged savings if you have a high-deductible health plan.', 900, 3200, 'Easy', 10, 'basic', 'Apr 15', 6),
  ('hire_kids', 'Hire Your Kids', 'Pay your children a reasonable wage for real work — tax-free to them, deductible to you.', 2000, 9000, 'Moderate', 30, 'pro', null, 7),
  ('augusta', 'Augusta Rule (14-Day Rental)', 'Rent your home to your business for up to 14 days a year, tax-free.', 1500, 7000, 'Moderate', 25, 'pro', 'Dec 31', 8),
  ('accountable_plan', 'Accountable Plan Reimbursements', 'Reimburse yourself tax-free for legit home-office and mileage costs.', 800, 3600, 'Easy', 15, 'pro', null, 9),
  ('tax_loss', 'Tax-Loss Harvesting', 'Offset capital gains by realizing losses on underperforming investments.', 500, 5000, 'Easy', 10, 'premium', 'Dec 31', 10)
on conflict (calc_type) do update set
  title = excluded.title,
  description = excluded.description,
  potential_savings_low = excluded.potential_savings_low,
  potential_savings_high = excluded.potential_savings_high,
  difficulty = excluded.difficulty,
  setup_time_minutes = excluded.setup_time_minutes,
  min_tier = excluded.min_tier,
  deadline = excluded.deadline,
  display_order = excluded.display_order;
