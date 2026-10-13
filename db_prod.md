## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  Unique |
| `phone` | `text` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `dashboard_user_id` | `uuid` |  Nullable |
| `business_id` | `uuid` |  Nullable |
| `is_admin` | `bool` |  Nullable |
| `is_owner` | `bool` |  Nullable |

## Table `quotes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `customer_name` | `text` |  Nullable |
| `customer_email` | `text` |  Nullable |
| `customer_phone` | `text` |  Nullable |
| `message` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `service` | `text` |  Nullable |
| `business_id` | `uuid` |  |

## Table `reservations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `service_id` | `uuid` |  Nullable |
| `customer_name` | `text` |  Nullable |
| `customer_phone` | `text` |  Nullable |
| `date` | `timestamptz` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `customer_mail` | `text` |  Nullable |
| `message` | `text` |  Nullable |
| `attended` | `bool` |  Nullable |
| `business_id` | `uuid` |  |
| `reminder_sent` | `bool` |  Nullable |
| `guests` | `int4` |  Nullable |

## Table `businesses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Nullable |
| `business_type` | `text` |  Nullable |
| `address` | `text` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `owner_id` | `uuid` |  Unique |
| `email` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `hours` | `jsonb` |  Nullable |
| `contact_email` | `text` |  Nullable |
| `maps_url` | `text` |  Nullable |
| `business_type_id` | `uuid` |  Nullable |
| `monthly_price` | `numeric` |  Nullable |
| `upsells` | `numeric` |  Nullable |
| `is_active` | `bool` |  |
| `stripe_customer_id` | `text` |  Nullable |
| `plan` | `text` |  Nullable |
| `google_location_id` | `text` |  Nullable Unique |
| `contact_phone` | `text` |  Nullable |

## Table `team_members`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `role` | `text` |  |
| `created_at` | `timestamp` |  Nullable |

## Table `services`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `price` | `numeric` |  Nullable |
| `duration` | `int4` |  Nullable |
| `category` | `text` |  Nullable |
| `active` | `bool` |  |
| `display_order` | `int4` |  |
| `created_at` | `timestamp` |  |

## Table `employees`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `name` | `text` |  |
| `role` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `active` | `bool` |  |
| `display_order` | `int4` |  |
| `created_at` | `timestamp` |  |

## Table `people`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `name` | `text` |  |
| `specialty` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `age` | `int4` |  Nullable |
| `portfolio_url` | `text` |  Nullable |
| `photo_url` | `text` |  Nullable |
| `active` | `bool` |  |
| `display_order` | `int4` |  |
| `created_at` | `timestamp` |  |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `date_of_birth` | `text` |  Nullable |
| `gender` | `text` |  Nullable |
| `height` | `text` |  Nullable |
| `eye_color` | `text` |  Nullable |
| `hair_color` | `text` |  Nullable |
| `languages` | `_text` |  Nullable |
| `skills` | `_text` |  Nullable |
| `projects` | `_text` |  Nullable |
| `photos` | `_text` |  Nullable |
| `slug` | `text` |  Nullable |
| `experiences` | `jsonb` |  Nullable |

## Table `products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `price` | `numeric` |  Nullable |
| `stock` | `int4` |  Nullable |
| `sku` | `text` |  Nullable |
| `category` | `text` |  Nullable |
| `active` | `bool` |  |
| `display_order` | `int4` |  |
| `created_at` | `timestamp` |  |
| `discount_price` | `numeric` |  Nullable |

## Table `business_types`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `text` |  Unique |
| `label` | `text` |  |
| `catalog` | `text` |  |
| `catalog_label` | `text` |  |
| `features` | `_text` |  |

## Table `projects`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `title` | `text` |  |
| `type` | `text` |  Nullable |
| `year` | `int4` |  Nullable |
| `description` | `text` |  Nullable |
| `photo_url` | `text` |  Nullable |
| `display_order` | `int4` |  Nullable |
| `active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `video_url` | `text` |  Nullable |

## Table `people_projects`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `person_id` | `uuid` |  |
| `project_id` | `uuid` |  |
| `role` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `session_id` | `text` |  Unique |
| `business_id` | `uuid` |  Nullable |
| `visitor_id` | `text` |  Nullable |
| `referrer` | `text` |  Nullable |
| `screen_width` | `int4` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `pages` | `jsonb` |  Nullable |
| `page_count` | `int4` |  Nullable |
| `duration_seconds` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `reviews`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  Nullable |
| `author_name` | `text` |  |
| `rating` | `int4` |  |
| `comment` | `text` |  |
| `reply` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `email` | `text` |  Nullable |

## Table `depenses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `label` | `text` |  |
| `amount` | `numeric` |  |
| `type` | `text` |  |
| `date` | `date` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `tickets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  Nullable |
| `subject` | `text` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `ticket_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `ticket_id` | `uuid` |  Nullable |
| `sender` | `text` |  |
| `content` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `plans`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_type_id` | `uuid` |  Nullable |
| `slug` | `text` |  |
| `label` | `text` |  |
| `features` | `_text` |  Nullable |
| `monthly_price` | `numeric` |  |
| `stripe_price_id` | `text` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `add_ons`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_type_id` | `uuid` |  Nullable |
| `feature_key` | `text` |  |
| `label` | `text` |  |
| `monthly_price` | `numeric` |  |
| `stripe_price_id` | `text` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `stripe_subscriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  Nullable |
| `stripe_subscription_id` | `text` |  |
| `stripe_subscription_item_id` | `text` |  Nullable |
| `type` | `text` |  |
| `plan_id` | `uuid` |  Nullable |
| `addon_id` | `uuid` |  Nullable |
| `feature_key` | `text` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `email_unsubscribes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  Nullable |
| `email` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `email_campaigns`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  Nullable |
| `subject` | `text` |  |
| `body` | `text` |  |
| `sent_count` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `prospects`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `place_id` | `text` |  Nullable Unique |
| `name` | `text` |  |
| `address` | `text` |  Nullable |
| `rating` | `numeric` |  Nullable |
| `business_type` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `phone` | `text` |  Nullable |
| `website` | `text` |  Nullable |
| `preview_opened_at` | `timestamptz` |  Nullable |
| `preview_open_count` | `int4` |  Nullable |
| `opening_hours` | `jsonb` |  Nullable |

## Table `portfolio_projects`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `category` | `text` |  |
| `description` | `text` |  |
| `tags` | `_text` |  |
| `image_url` | `text` |  |
| `url` | `text` |  |
| `featured` | `bool` |  |
| `display_order` | `int4` |  |
| `active` | `bool` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `blog`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `slug` | `text` |  |
| `title` | `text` |  |
| `date` | `text` |  |
| `category` | `text` |  |
| `excerpt` | `text` |  |
| `content` | `text` |  |
| `active` | `bool` |  |
| `display_order` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `cover_url` | `text` |  Nullable |

## Table `orders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `customer_name` | `text` |  Nullable |
| `customer_email` | `text` |  Nullable |
| `customer_phone` | `text` |  Nullable |
| `status` | `text` |  |
| `total_amount` | `numeric` |  |
| `items` | `jsonb` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `order_number` | `text` |  Nullable Unique |
| `tracking_number` | `text` |  Nullable |

## Table `google_reviews`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `review_name` | `text` | Primary |
| `business_id` | `uuid` |  Nullable |
| `location_id` | `text` |  Nullable |
| `reviewer_name` | `text` |  Nullable |
| `rating` | `int4` |  Nullable |
| `comment` | `text` |  Nullable |
| `create_time` | `text` |  Nullable |
| `generated_reply` | `text` |  Nullable |
| `sentiment` | `text` |  Nullable |
| `needs_human_review` | `bool` |  Nullable |
| `reason` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `published_reply` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## RLS Policies

### `users`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `user can read own profile` | SELECT | public | PERMISSIVE | `(dashboard_user_id = auth.uid())` | — |
| `users_read_self` | SELECT | authenticated | PERMISSIVE | `(dashboard_user_id = auth.uid())` | — |
| `users_read_admin` | SELECT | authenticated | PERMISSIVE | `is_vwa_admin()` | — |
| `user can update own profile` | ALL | public | PERMISSIVE | `(dashboard_user_id = auth.uid())` | — |
| `users_update_self` | UPDATE | authenticated | PERMISSIVE | `(dashboard_user_id = auth.uid())` | `(dashboard_user_id = auth.uid())` |
| `users_update_admin` | UPDATE | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `products`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `business members` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = products.business_id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = products.business_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `products_read_public` | SELECT | public | PERMISSIVE | `(active = true)` | — |
| `products_read_owner` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = products.business_id) OR (users.is_admin = true)))))` | — |
| `Owner can manage products` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (businesses b      JOIN users u ON ((u.id = b.owner_id)))   WHERE ((b.id = products.business_id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM (businesses b      JOIN users u ON ((u.id = b.owner_id)))   WHERE ((b.id = products.business_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `products_write_owner` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = products.business_id) OR (users.is_admin = true)))))` | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = products.business_id) OR (users.is_admin = true)))))` |
| `products: public can read` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `products: owner can manage own` | ALL | authenticated | PERMISSIVE | `(business_id = my_business_id())` | `(business_id = my_business_id())` |
| `products: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `reviews`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can update reply on their business reviews` | UPDATE | public | PERMISSIVE | `(business_id IN ( SELECT users.business_id    FROM users   WHERE (users.dashboard_user_id = auth.uid())))` | `(business_id IN ( SELECT users.business_id    FROM users   WHERE (users.dashboard_user_id = auth.uid())))` |
| `Anyone can insert reviews` | INSERT | public | PERMISSIVE | — | `true` |
| `Anyone can read reviews` | SELECT | public | PERMISSIVE | `true` | — |
| `reviews_read_public` | SELECT | public | PERMISSIVE | `true` | — |
| `reviews_insert_anon` | INSERT | public | PERMISSIVE | — | `(reply IS NULL)` |
| `reviews_update_owner` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = reviews.business_id) OR (users.is_admin = true)))))` | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = reviews.business_id) OR (users.is_admin = true)))))` |
| `reviews_delete_owner` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = reviews.business_id) OR (users.is_admin = true)))))` | — |
| `reviews: public can read` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `reviews: anon can insert` | INSERT | anon | PERMISSIVE | — | `true` |
| `reviews: owner can reply` | UPDATE | authenticated | PERMISSIVE | `(business_id = my_business_id())` | `(business_id = my_business_id())` |
| `reviews: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `people`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `people_read_public` | SELECT | public | PERMISSIVE | `(active = true)` | — |
| `business members` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = people.business_id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = people.business_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `Owner can manage people` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (businesses b      JOIN users u ON ((u.id = b.owner_id)))   WHERE ((b.id = people.business_id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM (businesses b      JOIN users u ON ((u.id = b.owner_id)))   WHERE ((b.id = people.business_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `Public can read people` | SELECT | anon | PERMISSIVE | `true` | — |
| `people_read_owner` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = people.business_id) OR (users.is_admin = true)))))` | — |
| `people_write_owner` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = people.business_id) OR (users.is_admin = true)))))` | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = people.business_id) OR (users.is_admin = true)))))` |
| `people: public can read` | SELECT | anon, authenticated | PERMISSIVE | `(active = true)` | — |
| `people: owner can manage own` | ALL | authenticated | PERMISSIVE | `(business_id = my_business_id())` | `(business_id = my_business_id())` |
| `people: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `blog`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public read` | SELECT | public | PERMISSIVE | `true` | — |
| `Auth write` | ALL | public | PERMISSIVE | `(auth.role() = 'authenticated'::text)` | — |
| `blog_read_public` | SELECT | public | PERMISSIVE | `(active = true)` | — |
| `blog_read_owner` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND (users.business_id = blog.business_id))))` | — |
| `blog_write_owner` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = blog.business_id) OR (users.is_admin = true)))))` | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = blog.business_id) OR (users.is_admin = true)))))` |
| `blog: public can read` | SELECT | anon, authenticated | PERMISSIVE | `(active = true)` | — |
| `blog: owner can write own` | ALL | authenticated | PERMISSIVE | `(business_id = my_business_id())` | `(business_id = my_business_id())` |
| `blog: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `projects`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `projects_read_public` | SELECT | public | PERMISSIVE | `(active = true)` | — |
| `projects_read_owner` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = projects.business_id) OR (users.is_admin = true)))))` | — |
| `projects_write_owner` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = projects.business_id) OR (users.is_admin = true)))))` | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = projects.business_id) OR (users.is_admin = true)))))` |
| `projects_auth_all` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (businesses b      JOIN users u ON ((u.id = b.owner_id)))   WHERE (b.id = projects.business_id)))` | `(EXISTS ( SELECT 1    FROM (businesses b      JOIN users u ON ((u.id = b.owner_id)))   WHERE (b.id = projects.business_id)))` |
| `business members` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = projects.business_id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = projects.business_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `projects_anon_select` | SELECT | anon | PERMISSIVE | `(active = true)` | — |
| `projects_auth_select` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((businesses b      JOIN team_members tm ON ((tm.business_id = b.id)))      JOIN users u ON ((u.id = tm.user_id)))   WHERE ((b.id = projects.business_id) AND (u.dashboard_user_id = auth.uid()))))` | — |
| `projects_auth_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM ((businesses b      JOIN team_members tm ON ((tm.business_id = b.id)))      JOIN users u ON ((u.id = tm.user_id)))   WHERE ((b.id = projects.business_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `projects_auth_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((businesses b      JOIN team_members tm ON ((tm.business_id = b.id)))      JOIN users u ON ((u.id = tm.user_id)))   WHERE ((b.id = projects.business_id) AND (u.dashboard_user_id = auth.uid()))))` | — |
| `projects_auth_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((businesses b      JOIN team_members tm ON ((tm.business_id = b.id)))      JOIN users u ON ((u.id = tm.user_id)))   WHERE ((b.id = projects.business_id) AND (u.dashboard_user_id = auth.uid()))))` | — |
| `projects: public can read` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `projects: owner can manage own` | ALL | authenticated | PERMISSIVE | `(business_id = my_business_id())` | `(business_id = my_business_id())` |
| `projects: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `services`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `services_read_public` | SELECT | public | PERMISSIVE | `(active = true)` | — |
| `services_read_owner` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = services.business_id) OR (users.is_admin = true)))))` | — |
| `Lecture publique des services actifs` | SELECT | anon | PERMISSIVE | `(active = true)` | — |
| `business members` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = services.business_id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = services.business_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `Owner can manage services` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (businesses b      JOIN users u ON ((u.id = b.owner_id)))   WHERE ((b.id = services.business_id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM (businesses b      JOIN users u ON ((u.id = b.owner_id)))   WHERE ((b.id = services.business_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `services_write_owner` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = services.business_id) OR (users.is_admin = true)))))` | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = services.business_id) OR (users.is_admin = true)))))` |
| `services: public can read` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `services: owner can manage own` | ALL | authenticated | PERMISSIVE | `(business_id = my_business_id())` | `(business_id = my_business_id())` |
| `services: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `people_projects`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `pp_auth_all` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((projects p      JOIN businesses b ON ((b.id = p.business_id)))      JOIN users u ON ((u.id = b.owner_id)))   WHERE (p.id = people_projects.project_id)))` | `(EXISTS ( SELECT 1    FROM ((projects p      JOIN businesses b ON ((b.id = p.business_id)))      JOIN users u ON ((u.id = b.owner_id)))   WHERE (p.id = people_projects.project_id)))` |
| `business members` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (projects p      JOIN users u ON ((u.business_id = p.business_id)))   WHERE ((p.id = people_projects.project_id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM (projects p      JOIN users u ON ((u.business_id = p.business_id)))   WHERE ((p.id = people_projects.project_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `pp_anon_select` | SELECT | anon | PERMISSIVE | `true` | — |
| `pp_auth_select` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (((projects p      JOIN businesses b ON ((b.id = p.business_id)))      JOIN team_members tm ON ((tm.business_id = b.id)))      JOIN users u ON ((u.id = tm.user_id)))   WHERE ((p.id = people_projects.project_id) AND (u.dashboard_user_id = auth.uid()))))` | — |
| `pp_auth_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (((projects p      JOIN businesses b ON ((b.id = p.business_id)))      JOIN team_members tm ON ((tm.business_id = b.id)))      JOIN users u ON ((u.id = tm.user_id)))   WHERE ((p.id = people_projects.project_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `pp_auth_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (((projects p      JOIN businesses b ON ((b.id = p.business_id)))      JOIN team_members tm ON ((tm.business_id = b.id)))      JOIN users u ON ((u.id = tm.user_id)))   WHERE ((p.id = people_projects.project_id) AND (u.dashboard_user_id = auth.uid()))))` | — |
| `people_projects_read_public` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM people   WHERE ((people.id = people_projects.person_id) AND (people.active = true))))` | — |
| `people_projects_read_owner` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (people      JOIN users ON ((users.business_id = people.business_id)))   WHERE ((people.id = people_projects.person_id) AND ((users.dashboard_user_id = auth.uid()) OR (users.is_admin = true)))))` | — |
| `people_projects_write_owner` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (people      JOIN users ON ((users.business_id = people.business_id)))   WHERE ((people.id = people_projects.person_id) AND ((users.dashboard_user_id = auth.uid()) OR (users.is_admin = true)))))` | `(EXISTS ( SELECT 1    FROM (people      JOIN users ON ((users.business_id = people.business_id)))   WHERE ((people.id = people_projects.person_id) AND ((users.dashboard_user_id = auth.uid()) OR (users.is_admin = true)))))` |
| `people_projects: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |
| `people_projects: public can read` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `people_projects: owner can manage own` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM people p   WHERE ((p.id = people_projects.person_id) AND (p.business_id = my_business_id()))))` | `(EXISTS ( SELECT 1    FROM people p   WHERE ((p.id = people_projects.person_id) AND (p.business_id = my_business_id()))))` |

### `sessions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can view their business sessions` | SELECT | public | PERMISSIVE | `(business_id IN ( SELECT users.business_id    FROM users   WHERE (users.dashboard_user_id = auth.uid())))` | — |
| `sessions_insert_anon` | INSERT | public | PERMISSIVE | — | `true` |
| `sessions_update_anon` | UPDATE | public | PERMISSIVE | `true` | `true` |
| `sessions_read_owner` | SELECT | authenticated | PERMISSIVE | `((business_id = my_business_id()) OR is_vwa_admin())` | — |
| `sessions_delete_admin` | DELETE | authenticated | PERMISSIVE | `is_vwa_admin()` | — |

### `businesses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `business members` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = businesses.id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = businesses.id) AND (u.dashboard_user_id = auth.uid()))))` |
| `owner access` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = businesses.owner_id) AND (users.dashboard_user_id = auth.uid()))))` | — |
| `businesses_read_owner` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.id = businesses.owner_id) OR (users.is_admin = true)))))` | — |
| `businesses_update_owner` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.id = businesses.owner_id) OR (users.is_admin = true)))))` | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.id = businesses.owner_id) OR (users.is_admin = true)))))` |
| `businesses_insert_admin` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND (users.is_admin = true))))` |
| `businesses_delete_admin` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND (users.is_admin = true))))` | — |

### `quotes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `allow_insert_quotes` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `business members` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = quotes.business_id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = quotes.business_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `quotes_read_owner` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = quotes.business_id) OR (users.is_admin = true)))))` | — |
| `quotes_update_owner` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = quotes.business_id) OR (users.is_admin = true)))))` | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = quotes.business_id) OR (users.is_admin = true)))))` |
| `quotes_delete_admin` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND (users.is_admin = true))))` | — |
| `quotes: owner can read own` | SELECT | authenticated | PERMISSIVE | `(business_id = my_business_id())` | — |
| `quotes: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `reservations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `business members` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = reservations.business_id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = reservations.business_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `reservations_read_owner` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = reservations.business_id) OR (users.is_admin = true)))))` | — |
| `reservations_update_owner` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = reservations.business_id) OR (users.is_admin = true)))))` | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = reservations.business_id) OR (users.is_admin = true)))))` |
| `reservations_delete_admin` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND (users.is_admin = true))))` | — |
| `reservations: owner can read own` | SELECT | authenticated | PERMISSIVE | `(business_id = my_business_id())` | — |
| `reservations: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `employees`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `business members` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = employees.business_id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.business_id = employees.business_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `Owner can manage employees` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (businesses b      JOIN users u ON ((u.id = b.owner_id)))   WHERE ((b.id = employees.business_id) AND (u.dashboard_user_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM (businesses b      JOIN users u ON ((u.id = b.owner_id)))   WHERE ((b.id = employees.business_id) AND (u.dashboard_user_id = auth.uid()))))` |
| `employees_read_public` | SELECT | public | PERMISSIVE | `(active = true)` | — |
| `employees_read_owner` | SELECT | authenticated | PERMISSIVE | `((business_id = my_business_id()) OR is_vwa_admin())` | — |
| `employees_write_owner` | ALL | authenticated | PERMISSIVE | `((business_id = my_business_id()) OR is_vwa_admin())` | `((business_id = my_business_id()) OR is_vwa_admin())` |

### `business_types`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Authenticated can read business_types` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `business_types: public can read` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `business_types: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `portfolio_projects`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `portfolio_read_public` | SELECT | public | PERMISSIVE | `(active = true)` | — |
| `portfolio_read_admin` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND (users.is_admin = true))))` | — |
| `portfolio_write_admin` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND (users.is_admin = true))))` | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND (users.is_admin = true))))` |
| `portfolio_projects: public can read` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `portfolio_projects: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `orders`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `orders_read_owner` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = orders.business_id) OR (users.is_admin = true)))))` | — |
| `orders_update_owner` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = orders.business_id) OR (users.is_admin = true)))))` | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND ((users.business_id = orders.business_id) OR (users.is_admin = true)))))` |
| `orders_delete_admin` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND (users.is_admin = true))))` | — |
| `orders: anon can insert` | INSERT | anon | PERMISSIVE | — | `true` |
| `orders: owner can read own` | SELECT | authenticated | PERMISSIVE | `(business_id = my_business_id())` | — |
| `orders: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `team_members`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `team_members_read_own` | SELECT | authenticated | PERMISSIVE | `((business_id = my_business_id()) OR is_vwa_admin())` | — |
| `team_members_write_owner` | ALL | authenticated | PERMISSIVE | `(((business_id = my_business_id()) AND (EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND (users.is_owner = true))))) OR is_vwa_admin())` | `(((business_id = my_business_id()) AND (EXISTS ( SELECT 1    FROM users   WHERE ((users.dashboard_user_id = auth.uid()) AND (users.is_owner = true)))) AND (role <> 'owner'::text)) OR is_vwa_admin())` |

### `plans`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `plans_read_public` | SELECT | public | PERMISSIVE | `(is_active = true)` | — |
| `plans_read_admin` | SELECT | authenticated | PERMISSIVE | `is_vwa_admin()` | — |

### `add_ons`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `add_ons_read_public` | SELECT | public | PERMISSIVE | `(is_active = true)` | — |
| `add_ons_read_admin` | SELECT | authenticated | PERMISSIVE | `is_vwa_admin()` | — |

### `stripe_subscriptions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `stripe_subscriptions: owner can read own` | SELECT | authenticated | PERMISSIVE | `(business_id = my_business_id())` | — |
| `stripe_subscriptions: admin can read all` | SELECT | authenticated | PERMISSIVE | `is_vwa_admin()` | — |

### `depenses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `depenses: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `tickets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tickets: owner can read own` | SELECT | authenticated | PERMISSIVE | `(business_id = my_business_id())` | — |
| `tickets: owner can insert own` | INSERT | authenticated | PERMISSIVE | — | `(business_id = my_business_id())` |
| `tickets: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `ticket_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ticket_messages: owner can read own` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM tickets t   WHERE ((t.id = ticket_messages.ticket_id) AND (t.business_id = my_business_id()))))` | — |
| `ticket_messages: owner can insert as client` | INSERT | authenticated | PERMISSIVE | — | `((sender = 'client'::text) AND (EXISTS ( SELECT 1    FROM tickets t   WHERE ((t.id = ticket_messages.ticket_id) AND (t.business_id = my_business_id())))))` |
| `ticket_messages: admin full access` | ALL | authenticated | PERMISSIVE | `is_vwa_admin()` | `is_vwa_admin()` |

### `google_reviews`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `business owner can read own reviews` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT users.business_id    FROM users   WHERE (users.id = auth.uid())))` | — |

