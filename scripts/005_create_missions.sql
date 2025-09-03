-- Missions, progress tracking, influence metrics, and explicit user consents
-- Safe to run multiple times (IF NOT EXISTS guards) and compatible with existing RLS model

-- Missions catalog
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                          -- short code like M-ALCATRAZ-001
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard','legendary')) DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  requires_admin BOOLEAN DEFAULT FALSE,               -- RBAC gate
  max_participants INTEGER,                           -- optional cap
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-user mission enrollment and state machine
CREATE TABLE IF NOT EXISTS public.user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('accepted','in_progress','completed','failed','abandoned')) DEFAULT 'accepted',
  progress JSONB DEFAULT '{}',                        -- arbitrary structured progress
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (mission_id, user_id)
);

-- Mission event stream (immutable audit)
CREATE TABLE IF NOT EXISTS public.mission_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- system events may be NULL
  event_type TEXT NOT NULL,                    -- e.g. 'accepted','checkpoint','objective','completed','failed'
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Influence/follower metrics events (append-only)
CREATE TABLE IF NOT EXISTS public.influence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('follow','unfollow','mission_completed','boost','share')),
  delta INTEGER NOT NULL,                       -- positive or negative influence change
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Influence snapshots for fast dashboards
CREATE TABLE IF NOT EXISTS public.follower_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  followers_count INTEGER DEFAULT 0,
  influence_score INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Explicit user consents with versioning and revocation
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('distributed_compute','analytics','marketing')),
  granted BOOLEAN NOT NULL,
  version TEXT NOT NULL,                         -- policy/version string
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Row Level Security
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follower_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Missions RLS: anyone can read active missions, admins manage
CREATE POLICY IF NOT EXISTS "Read active missions" ON public.missions
  FOR SELECT USING (is_active = TRUE OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));

CREATE POLICY IF NOT EXISTS "Admins manage missions" ON public.missions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));

-- user_missions: users manage their own rows; admins can view
CREATE POLICY IF NOT EXISTS "Users manage own user_missions" ON public.user_missions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Admins view user_missions" ON public.user_missions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));

-- mission_updates: select for participants or admins; insert by participant or system
CREATE POLICY IF NOT EXISTS "Participants view mission_updates" ON public.mission_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_missions um
      WHERE um.mission_id = mission_updates.mission_id
        AND (um.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin))
    )
  );

CREATE POLICY IF NOT EXISTS "Users insert their mission_updates" ON public.mission_updates
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- influence_events: users insert their own; select own; admins view all
CREATE POLICY IF NOT EXISTS "Users manage own influence_events" ON public.influence_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Admins view influence_events" ON public.influence_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));

-- follower_metrics: users view own; system upserts; admins view all
CREATE POLICY IF NOT EXISTS "Users view own follower_metrics" ON public.follower_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "System manage follower_metrics" ON public.follower_metrics
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY IF NOT EXISTS "Admins view follower_metrics" ON public.follower_metrics
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));

-- user_consents: users manage their consents; admins read
CREATE POLICY IF NOT EXISTS "Users manage own consents" ON public.user_consents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Admins view consents" ON public.user_consents
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_user_missions_user ON public.user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission ON public.user_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_updates_mission ON public.mission_updates(mission_id);
CREATE INDEX IF NOT EXISTS idx_influence_events_user ON public.influence_events(user_id);
CREATE INDEX IF NOT EXISTS idx_follower_metrics_user ON public.follower_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_user ON public.user_consents(user_id);

-- Seed: none (no demo data permitted)


