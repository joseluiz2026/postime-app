-- Storage: private bucket for user-uploaded photos that can replace a video's cover image
-- when the filename matches a word in that roteiro's text (see matchedOwnImageForRoteiro).
insert into storage.buckets (id, name, public)
values ('postime-images', 'postime-images', false)
on conflict (id) do nothing;

create policy "postime-images: user can select own files"
  on storage.objects for select
  using (bucket_id = 'postime-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-images: user can insert own files"
  on storage.objects for insert
  with check (bucket_id = 'postime-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-images: user can update own files"
  on storage.objects for update
  using (bucket_id = 'postime-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-images: user can delete own files"
  on storage.objects for delete
  using (bucket_id = 'postime-images' and (storage.foldername(name))[1] = auth.uid()::text);
