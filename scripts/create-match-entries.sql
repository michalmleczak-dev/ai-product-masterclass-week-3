-- Uruchom ten plik w Supabase Dashboard → SQL Editor
-- Tworzy funkcję match_entries do wyszukiwania wektorowego (pgvector)
-- Uwaga: typy muszą odpowiadać dokładnie kolumnom tabeli entries

drop function if exists match_entries(vector, integer, uuid);

create function match_entries(
  query_embedding vector(1536),
  match_count     int,
  p_user_id       uuid
)
returns table (
  id            text,
  date          date,
  mood_label    text,
  mood_category text,
  text          text,
  similarity    float
)
language plpgsql
as $$
begin
  return query
  select
    e.id,
    e.date,
    e.mood_label,
    e.mood_category,
    e.text,
    (1 - (e.embedding <=> query_embedding))::float as similarity
  from entries e
  where e.user_id = p_user_id
    and e.embedding is not null
  order by e.embedding <=> query_embedding
  limit match_count;
end;
$$;
