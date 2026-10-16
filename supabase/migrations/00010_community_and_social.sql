-- ============================================================================
-- Migration 00010: GoviSahana Agricultural Community & Social Networking
-- ============================================================================
-- Adds:
--  - community_posts (feeds, media, hashtags, visibility, quote shares)
--  - post_likes (toggleable likes)
--  - post_comments (threaded replies)
--  - post_saves (bookmarks)
--  - post_shares (reposts & quotes tracking)
--  - friend_requests (connections system: send, accept, reject, cancel)
--  - user_follows (asymmetric following)
--  - direct_conversations & direct_messages (peer messaging)
--  - user_blocks (blocking & privacy)
--  - community_profiles (cover photo, bio, crops, interests)
--  - RLS policies on all tables
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. COMMUNITY PROFILES (Cover photos, bio, crops, agricultural interests)
-- ---------------------------------------------------------------------------
create table if not exists public.community_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles(id) on delete cascade,
  cover_url   text,
  bio         text,
  district    text,
  languages   text,
  interests   text,
  crops       text,
  profession  text,
  website     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists community_profiles_user_id_idx on public.community_profiles(user_id);
create index if not exists community_profiles_district_idx on public.community_profiles(district);

create trigger community_profiles_set_updated_at
  before update on public.community_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. COMMUNITY POSTS
-- ---------------------------------------------------------------------------
create table if not exists public.community_posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  content        text not null check (char_length(content) >= 1),
  category       text not null default 'GENERAL',
  media_urls     text,                                   -- JSON string or array of URLs
  hashtags       text,                                   -- space or comma separated
  visibility     text not null default 'PUBLIC' check (visibility in ('PUBLIC', 'CONNECTIONS')),
  pinned         boolean not null default false,
  shared_post_id uuid references public.community_posts(id) on delete set null,
  shared_caption text,
  likes_count    integer not null default 0 check (likes_count >= 0),
  comments_count integer not null default 0 check (comments_count >= 0),
  shares_count   integer not null default 0 check (shares_count >= 0),
  saves_count    integer not null default 0 check (saves_count >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists community_posts_author_id_idx   on public.community_posts(author_id);
create index if not exists community_posts_category_idx    on public.community_posts(category);
create index if not exists community_posts_created_at_idx  on public.community_posts(created_at desc);
create index if not exists community_posts_shared_post_idx on public.community_posts(shared_post_id);

create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. POST LIKES
-- ---------------------------------------------------------------------------
create table if not exists public.post_likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists post_likes_post_id_idx on public.post_likes(post_id);
create index if not exists post_likes_user_id_idx on public.post_likes(user_id);

-- ---------------------------------------------------------------------------
-- 4. POST COMMENTS & THREADED REPLIES
-- ---------------------------------------------------------------------------
create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid references public.post_comments(id) on delete cascade,
  content    text not null check (char_length(content) >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_comments_post_id_idx   on public.post_comments(post_id);
create index if not exists post_comments_author_id_idx on public.post_comments(author_id);
create index if not exists post_comments_parent_id_idx on public.post_comments(parent_id);

create trigger post_comments_set_updated_at
  before update on public.post_comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. POST SAVES (BOOKMARKS)
-- ---------------------------------------------------------------------------
create table if not exists public.post_saves (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists post_saves_user_id_idx on public.post_saves(user_id);

-- ---------------------------------------------------------------------------
-- 6. POST SHARES
-- ---------------------------------------------------------------------------
create table if not exists public.post_shares (
  id               uuid primary key default gen_random_uuid(),
  original_post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  caption          text,
  created_at       timestamptz not null default now()
);

create index if not exists post_shares_original_post_idx on public.post_shares(original_post_id);
create index if not exists post_shares_user_id_idx       on public.post_shares(user_id);

-- ---------------------------------------------------------------------------
-- 7. FRIEND REQUESTS (CONNECTIONS)
-- ---------------------------------------------------------------------------
create table if not exists public.friend_requests (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (sender_id, receiver_id),
  check (sender_id != receiver_id)
);

create index if not exists friend_requests_sender_idx   on public.friend_requests(sender_id);
create index if not exists friend_requests_receiver_idx on public.friend_requests(receiver_id);
create index if not exists friend_requests_status_idx   on public.friend_requests(status);

create trigger friend_requests_set_updated_at
  before update on public.friend_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. USER FOLLOWS (ASYMMETRIC)
-- ---------------------------------------------------------------------------
create table if not exists public.user_follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id != following_id)
);

create index if not exists user_follows_follower_idx  on public.user_follows(follower_id);
create index if not exists user_follows_following_idx on public.user_follows(following_id);

-- ---------------------------------------------------------------------------
-- 9. DIRECT MESSAGING (CONVERSATIONS & MESSAGES)
-- ---------------------------------------------------------------------------
create table if not exists public.direct_conversations (
  id              uuid primary key default gen_random_uuid(),
  user1_id        uuid not null references public.profiles(id) on delete cascade,
  user2_id        uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (user1_id, user2_id),
  check (user1_id != user2_id)
);

create index if not exists direct_conversations_user1_idx on public.direct_conversations(user1_id);
create index if not exists direct_conversations_user2_idx on public.direct_conversations(user2_id);

create table if not exists public.direct_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) >= 1),
  media_url       text,
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists direct_messages_conversation_idx on public.direct_messages(conversation_id);
create index if not exists direct_messages_sender_idx       on public.direct_messages(sender_id);
create index if not exists direct_messages_read_idx         on public.direct_messages(read) where read = false;

-- ---------------------------------------------------------------------------
-- 10. USER BLOCKS
-- ---------------------------------------------------------------------------
create table if not exists public.user_blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id != blocked_id)
);

create index if not exists user_blocks_blocker_idx on public.user_blocks(blocker_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------------

alter table public.community_profiles    enable row level security;
alter table public.community_posts       enable row level security;
alter table public.post_likes            enable row level security;
alter table public.post_comments         enable row level security;
alter table public.post_saves            enable row level security;
alter table public.post_shares           enable row level security;
alter table public.friend_requests       enable row level security;
alter table public.user_follows          enable row level security;
alter table public.direct_conversations  enable row level security;
alter table public.direct_messages       enable row level security;
alter table public.user_blocks           enable row level security;

-- Community Profiles
create policy "community_profiles_read_all"
  on public.community_profiles for select
  using (true);

create policy "community_profiles_upsert_own"
  on public.community_profiles for insert
  with check (auth.uid() = user_id);

create policy "community_profiles_update_own"
  on public.community_profiles for update
  using (auth.uid() = user_id);

-- Community Posts
create policy "community_posts_select_public"
  on public.community_posts for select
  using (
    visibility = 'PUBLIC'
    or author_id = auth.uid()
    or exists (
      select 1 from public.friend_requests
      where status = 'ACCEPTED'
        and ((sender_id = auth.uid() and receiver_id = community_posts.author_id)
          or (receiver_id = auth.uid() and sender_id = community_posts.author_id))
    )
  );

create policy "community_posts_insert_auth"
  on public.community_posts for insert
  with check (auth.uid() = author_id);

create policy "community_posts_update_own_or_admin"
  on public.community_posts for update
  using (auth.uid() = author_id or public.is_admin());

create policy "community_posts_delete_own_or_admin"
  on public.community_posts for delete
  using (auth.uid() = author_id or public.is_admin());

-- Post Likes
create policy "post_likes_select_all"
  on public.post_likes for select
  using (true);

create policy "post_likes_insert_own"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

create policy "post_likes_delete_own"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- Post Comments
create policy "post_comments_select_all"
  on public.post_comments for select
  using (true);

create policy "post_comments_insert_auth"
  on public.post_comments for insert
  with check (auth.uid() = author_id);

create policy "post_comments_update_own"
  on public.post_comments for update
  using (auth.uid() = author_id);

create policy "post_comments_delete_own_or_admin"
  on public.post_comments for delete
  using (auth.uid() = author_id or public.is_admin());

-- Post Saves
create policy "post_saves_select_own"
  on public.post_saves for select
  using (auth.uid() = user_id);

create policy "post_saves_insert_own"
  on public.post_saves for insert
  with check (auth.uid() = user_id);

create policy "post_saves_delete_own"
  on public.post_saves for delete
  using (auth.uid() = user_id);

-- Post Shares
create policy "post_shares_select_all"
  on public.post_shares for select
  using (true);

create policy "post_shares_insert_own"
  on public.post_shares for insert
  with check (auth.uid() = user_id);

-- Friend Requests
create policy "friend_requests_select_involved"
  on public.friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "friend_requests_insert_sender"
  on public.friend_requests for insert
  with check (auth.uid() = sender_id);

create policy "friend_requests_update_involved"
  on public.friend_requests for update
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "friend_requests_delete_involved"
  on public.friend_requests for delete
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- User Follows
create policy "user_follows_select_all"
  on public.user_follows for select
  using (true);

create policy "user_follows_insert_own"
  on public.user_follows for insert
  with check (auth.uid() = follower_id);

create policy "user_follows_delete_own"
  on public.user_follows for delete
  using (auth.uid() = follower_id);

-- Direct Conversations & Messages
create policy "direct_conversations_select_participants"
  on public.direct_conversations for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "direct_conversations_insert_participants"
  on public.direct_conversations for insert
  with check (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "direct_messages_select_participants"
  on public.direct_messages for select
  using (
    exists (
      select 1 from public.direct_conversations
      where id = direct_messages.conversation_id
        and (user1_id = auth.uid() or user2_id = auth.uid())
    )
  );

create policy "direct_messages_insert_sender"
  on public.direct_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.direct_conversations
      where id = direct_messages.conversation_id
        and (user1_id = auth.uid() or user2_id = auth.uid())
    )
  );

create policy "direct_messages_update_recipient"
  on public.direct_messages for update
  using (
    exists (
      select 1 from public.direct_conversations
      where id = direct_messages.conversation_id
        and (user1_id = auth.uid() or user2_id = auth.uid())
    )
  );

-- User Blocks
create policy "user_blocks_select_own"
  on public.user_blocks for select
  using (auth.uid() = blocker_id);

create policy "user_blocks_insert_own"
  on public.user_blocks for insert
  with check (auth.uid() = blocker_id);

create policy "user_blocks_delete_own"
  on public.user_blocks for delete
  using (auth.uid() = blocker_id);

commit;
