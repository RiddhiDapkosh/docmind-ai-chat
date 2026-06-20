
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
-- match_document_chunks is security invoker and meant to be called by authenticated users; explicit grant
grant execute on function public.match_document_chunks(vector, uuid, uuid[], int) to authenticated;
