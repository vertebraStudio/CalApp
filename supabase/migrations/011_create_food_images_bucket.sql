-- Create the storage bucket for food images
insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', true)
on conflict (id) do nothing;

-- Set up RLS policies for the bucket
-- 1. Allow public access to read images
create policy "Allow public read access"
on storage.objects for select
using ( bucket_id = 'food-images' );

-- 2. Allow authenticated users to upload images
create policy "Allow authenticated uploads"
on storage.objects for insert
with check (
  bucket_id = 'food-images' 
  AND auth.role() = 'authenticated'
);

-- 3. Allow users to update their own images
create policy "Allow user update access"
on storage.objects for update
using ( bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1] );

-- 4. Allow users to delete their own images
create policy "Allow user delete access"
on storage.objects for delete
using ( bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1] );
