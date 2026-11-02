ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_notifications boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS class_alerts boolean NOT NULL DEFAULT true;

GRANT UPDATE (push_notifications, class_alerts) ON public.profiles TO authenticated;