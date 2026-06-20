
create policy "Users read own document files"
on storage.objects for select to authenticated
using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users upload own document files"
on storage.objects for insert to authenticated
with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own document files"
on storage.objects for delete to authenticated
using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
