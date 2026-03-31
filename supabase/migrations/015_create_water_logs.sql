-- Add water goal to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS water_goal_liters numeric DEFAULT 2.0;

-- Create water logs table
CREATE TABLE IF NOT EXISTS public.water_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    ml_consumed integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own water logs"
    ON public.water_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own water logs"
    ON public.water_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own water logs"
    ON public.water_logs FOR UPDATE
    USING (auth.uid() = user_id);

-- Standard updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.water_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
