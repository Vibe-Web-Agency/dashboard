## Table `business_types`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `text` |  Unique |
| `label` | `text` |  |
| `icon` | `text` |  Nullable |
| `booking_noun` | `text` |  |
| `created_at` | `timestamptz` |  |
| `party_noun` | `text` |  Nullable |
| `vertical_id` | `uuid` |  Nullable |
| `customer_noun` | `text` |  |
| `service_noun` | `text` |  |

## Table `agencies`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `slug` | `text` |  Unique |
| `is_internal` | `bool` |  |
| `status` | `text` |  |
| `logo_url` | `text` |  Nullable |
| `primary_color` | `text` |  Nullable |
| `contact_email` | `text` |  Nullable |
| `contact_phone` | `text` |  Nullable |
| `billing_email` | `text` |  Nullable |
| `billing_address` | `text` |  Nullable |
| `siren` | `text` |  Nullable |
| `stripe_customer_id` | `text` |  Nullable Unique |
| `stripe_account_id` | `text` |  Nullable Unique |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `whitelabel_settings` | `jsonb` |  Nullable |
| `byok_credentials` | `jsonb` |  Nullable |

## Table `businesses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `business_type_id` | `uuid` |  |
| `name` | `text` |  |
| `slug` | `text` |  |
| `status` | `text` |  |
| `logo_url` | `text` |  Nullable |
| `cover_url` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `primary_color` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `website_url` | `text` |  Nullable |
| `address_line` | `text` |  Nullable |
| `postal_code` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `country` | `text` |  |
| `latitude` | `numeric` |  Nullable |
| `longitude` | `numeric` |  Nullable |
| `maps_url` | `text` |  Nullable |
| `google_location_id` | `text` |  Nullable |
| `timezone` | `text` |  |
| `locale` | `text` |  |
| `billing_email` | `text` |  Nullable |
| `billing_address` | `text` |  Nullable |
| `siren` | `text` |  Nullable |
| `stripe_customer_id` | `text` |  Nullable Unique |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `social_links` | `jsonb` |  |
| `allowed_origins` | `_text` |  Nullable |
| `gbp_place_id` | `text` |  Nullable |
| `byok_override` | `jsonb` |  Nullable |
| `is_active` | `bool` |  |

## Table `business_hours`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `day_of_week` | `int2` |  |
| `open_time` | `time` |  |
| `close_time` | `time` |  |
| `label` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `business_closures`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `starts_on` | `date` |  |
| `ends_on` | `date` |  |
| `kind` | `text` |  |
| `open_time` | `time` |  Nullable |
| `close_time` | `time` |  Nullable |
| `reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `agency_domains`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `business_id` | `uuid` |  Nullable |
| `domain` | `text` |  Unique |
| `type` | `text` |  |
| `is_primary` | `bool` |  |
| `verified_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `agency_email_senders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `business_id` | `uuid` |  Nullable |
| `from_name` | `text` |  |
| `from_email` | `text` |  Unique |
| `reply_to` | `text` |  Nullable |
| `provider` | `text` |  |
| `is_verified` | `bool` |  |
| `is_default` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `email` | `text` |  |
| `phone` | `text` |  Nullable |
| `locale` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `status` | `text` |  |
| `last_sign_in_at` | `timestamptz` |  Nullable |

## Table `platform_admins`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `profile_id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  |

## Table `memberships`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `profile_id` | `uuid` |  |
| `agency_id` | `uuid` |  |
| `business_id` | `uuid` |  Nullable |
| `role` | `text` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `invitations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `business_id` | `uuid` |  Nullable |
| `invited_by` | `uuid` |  Nullable |
| `email` | `text` |  |
| `role` | `text` |  |
| `message` | `text` |  Nullable |
| `token_hash` | `text` |  Unique |
| `status` | `text` |  |
| `expires_at` | `timestamptz` |  |
| `accepted_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `modules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `text` |  Unique |
| `label` | `text` |  |
| `description` | `text` |  Nullable |
| `icon` | `text` |  Nullable |
| `category` | `text` |  |
| `is_core` | `bool` |  |
| `is_active` | `bool` |  |
| `sort_order` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `business_type_modules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `business_type_id` | `uuid` | Primary |
| `module_id` | `uuid` | Primary |

## Table `plans`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `slug` | `text` |  |
| `description` | `text` |  Nullable |
| `price_monthly_cents` | `int4` |  |
| `price_yearly_cents` | `int4` |  Nullable |
| `currency` | `text` |  |
| `is_active` | `bool` |  |
| `is_public` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `plan_modules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `plan_id` | `uuid` |  |
| `module_id` | `uuid` |  |
| `created_at` | `timestamptz` |  |

## Table `plan_quotas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `plan_id` | `uuid` | Primary |
| `meter` | `text` | Primary |
| `monthly_limit` | `int4` |  |

## Table `business_plans`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `agency_id` | `uuid` |  |
| `plan_id` | `uuid` |  |
| `status` | `text` |  |
| `price_monthly_cents` | `int4` |  Nullable |
| `setup_fee_cents` | `int4` |  Nullable |
| `currency` | `text` |  |
| `stripe_subscription_id` | `text` |  Nullable Unique |
| `trial_ends_at` | `timestamptz` |  Nullable |
| `current_period_start` | `timestamptz` |  Nullable |
| `current_period_end` | `timestamptz` |  Nullable |
| `cancelled_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `business_addons`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `agency_id` | `uuid` |  |
| `module_id` | `uuid` |  Nullable |
| `meter` | `text` |  Nullable |
| `extra_monthly_limit` | `int4` |  Nullable |
| `price_monthly_cents` | `int4` |  |
| `currency` | `text` |  |
| `status` | `text` |  |
| `stripe_item_id` | `text` |  Nullable Unique |
| `started_at` | `timestamptz` |  |
| `cancelled_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `business_module_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `module_id` | `uuid` |  |
| `is_enabled` | `bool` |  |
| `settings` | `jsonb` |  |
| `updated_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `usage_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `agency_id` | `uuid` |  |
| `module_id` | `uuid` |  Nullable |
| `profile_id` | `uuid` |  Nullable |
| `event_type` | `text` |  |
| `meter` | `text` |  Nullable |
| `quantity` | `int4` |  |
| `idempotency_key` | `text` |  Nullable Unique |
| `meta` | `jsonb` |  |
| `created_at` | `timestamptz` |  |

## Table `agency_plans`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `slug` | `text` |  Unique |
| `price_monthly_cents` | `int4` |  |
| `currency` | `text` |  |
| `max_businesses` | `int4` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `agency_plan_modules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `agency_plan_id` | `uuid` | Primary |
| `module_id` | `uuid` | Primary |

## Table `agency_subscriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `agency_plan_id` | `uuid` |  |
| `status` | `text` |  |
| `stripe_subscription_id` | `text` |  Nullable Unique |
| `current_period_start` | `timestamptz` |  Nullable |
| `current_period_end` | `timestamptz` |  Nullable |
| `cancelled_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `services`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `name` | `text` |  |
| `slug` | `text` |  |
| `description` | `text` |  Nullable |
| `price_cents` | `int4` |  Nullable |
| `currency` | `text` |  |
| `tax_rate` | `numeric` |  |
| `duration_min` | `int4` |  Nullable |
| `image_url` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `position` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `category` | `text` |  Nullable |

## Table `products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `name` | `text` |  |
| `slug` | `text` |  |
| `description` | `text` |  Nullable |
| `price_cents` | `int4` |  |
| `compare_price_cents` | `int4` |  Nullable |
| `currency` | `text` |  |
| `tax_rate` | `numeric` |  |
| `sku` | `text` |  Nullable |
| `stock` | `int4` |  Nullable |
| `image_url` | `text` |  Nullable |
| `images` | `jsonb` |  |
| `is_active` | `bool` |  |
| `position` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `product_variants`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `name` | `text` |  |
| `sku` | `text` |  Nullable |
| `price_cents` | `int4` |  Nullable |
| `stock` | `int4` |  Nullable |
| `is_active` | `bool` |  |
| `position` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `employees`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `profile_id` | `uuid` |  Nullable |
| `job_title` | `text` |  Nullable |
| `bio` | `text` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `show_on_site` | `bool` |  |
| `is_active` | `bool` |  |
| `position` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `planning_color` | `text` |  Nullable |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |

## Table `talents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `display_name` | `text` |  |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `slug` | `text` |  |
| `bio` | `text` |  Nullable |
| `date_of_birth` | `date` |  Nullable |
| `gender` | `text` |  Nullable |
| `height_cm` | `int2` |  Nullable |
| `eye_color` | `text` |  Nullable |
| `hair_color` | `text` |  Nullable |
| `languages` | `_text` |  |
| `skills` | `_text` |  |
| `specialties` | `_text` |  |
| `avatar_url` | `text` |  Nullable |
| `cover_url` | `text` |  Nullable |
| `photos` | `jsonb` |  |
| `portfolio_url` | `text` |  Nullable |
| `links` | `jsonb` |  |
| `attributes` | `jsonb` |  |
| `is_active` | `bool` |  |
| `position` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `experiences` | `jsonb` |  |
| `credits` | `_text` |  |

## Table `projects`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `title` | `text` |  |
| `slug` | `text` |  |
| `description` | `text` |  Nullable |
| `cover_url` | `text` |  Nullable |
| `images` | `jsonb` |  |
| `category` | `text` |  Nullable |
| `status` | `text` |  |
| `published_at` | `timestamptz` |  Nullable |
| `position` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `project_talents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `project_id` | `uuid` |  |
| `talent_id` | `uuid` |  |
| `role` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `blog_posts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `author_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `slug` | `text` |  |
| `excerpt` | `text` |  Nullable |
| `content` | `text` |  Nullable |
| `cover_url` | `text` |  Nullable |
| `tags` | `_text` |  |
| `status` | `text` |  |
| `published_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `reviews`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `customer_id` | `uuid` |  Nullable |
| `source` | `text` |  |
| `external_id` | `text` |  Nullable |
| `author_name` | `text` |  Nullable |
| `rating` | `int2` |  |
| `content` | `text` |  Nullable |
| `status` | `text` |  |
| `reply` | `text` |  Nullable |
| `replied_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `menu_sections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `position` | `int4` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `menu_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `menu_section_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `price_cents` | `int4` |  Nullable |
| `currency` | `text` |  |
| `tax_rate` | `numeric` |  |
| `image_url` | `text` |  Nullable |
| `allergens` | `_text` |  |
| `tags` | `_text` |  |
| `is_available` | `bool` |  |
| `position` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `customers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `profile_id` | `uuid` |  Nullable |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `source` | `text` |  |
| `tags` | `_text` |  |
| `is_blocked` | `bool` |  |
| `marketing_email_opt_in_at` | `timestamptz` |  Nullable |
| `marketing_sms_opt_in_at` | `timestamptz` |  Nullable |
| `anonymized_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `customer_notes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `customer_id` | `uuid` |  |
| `author_id` | `uuid` |  Nullable |
| `content` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `reservations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `customer_id` | `uuid` |  Nullable |
| `guest_name` | `text` |  Nullable |
| `service_id` | `uuid` |  Nullable |
| `employee_id` | `uuid` |  Nullable |
| `starts_at` | `timestamptz` |  |
| `ends_at` | `timestamptz` |  Nullable |
| `party_size` | `int2` |  |
| `status` | `text` |  |
| `source` | `text` |  |
| `customer_message` | `text` |  Nullable |
| `internal_note` | `text` |  Nullable |
| `reminder_sent_at` | `timestamptz` |  Nullable |
| `cancelled_at` | `timestamptz` |  Nullable |
| `cancellation_reason` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `orders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `customer_id` | `uuid` |  |
| `number` | `text` |  |
| `status` | `text` |  |
| `payment_status` | `text` |  |
| `payment_method` | `text` |  Nullable |
| `source` | `text` |  |
| `subtotal_cents` | `int4` |  |
| `discount_cents` | `int4` |  |
| `shipping_cents` | `int4` |  |
| `tax_cents` | `int4` |  |
| `total_cents` | `int4` |  |
| `refunded_cents` | `int4` |  |
| `currency` | `text` |  |
| `shipping_address` | `jsonb` |  Nullable |
| `billing_address` | `jsonb` |  Nullable |
| `customer_note` | `text` |  Nullable |
| `stripe_checkout_session_id` | `text` |  Nullable Unique |
| `stripe_payment_intent_id` | `text` |  Nullable Unique |
| `tracking_number` | `text` |  Nullable |
| `paid_at` | `timestamptz` |  Nullable |
| `shipped_at` | `timestamptz` |  Nullable |
| `cancelled_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `order_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `order_id` | `uuid` |  |
| `product_id` | `uuid` |  Nullable |
| `variant_id` | `uuid` |  Nullable |
| `product_name` | `text` |  |
| `variant_name` | `text` |  Nullable |
| `sku` | `text` |  Nullable |
| `unit_price_cents` | `int4` |  |
| `tax_rate` | `numeric` |  |
| `quantity` | `int4` |  |
| `total_cents` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `quotes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `customer_id` | `uuid` |  |
| `number` | `text` |  Nullable |
| `status` | `text` |  |
| `title` | `text` |  Nullable |
| `request_message` | `text` |  Nullable |
| `request_details` | `jsonb` |  |
| `valid_until` | `date` |  Nullable |
| `subtotal_cents` | `int4` |  |
| `discount_cents` | `int4` |  |
| `tax_cents` | `int4` |  |
| `total_cents` | `int4` |  |
| `currency` | `text` |  |
| `notes` | `text` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `viewed_at` | `timestamptz` |  Nullable |
| `accepted_at` | `timestamptz` |  Nullable |
| `declined_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `buyer` | `jsonb` |  Nullable |
| `seller` | `jsonb` |  Nullable |

## Table `quote_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `quote_id` | `uuid` |  |
| `description` | `text` |  |
| `quantity` | `numeric` |  |
| `unit_price_cents` | `int4` |  |
| `tax_rate` | `numeric` |  |
| `position` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `invoices`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `customer_id` | `uuid` |  |
| `order_id` | `uuid` |  Nullable |
| `quote_id` | `uuid` |  Nullable |
| `kind` | `text` |  |
| `credits_invoice_id` | `uuid` |  Nullable |
| `number` | `text` |  Nullable |
| `status` | `text` |  |
| `issued_at` | `timestamptz` |  Nullable |
| `due_date` | `date` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `viewed_at` | `timestamptz` |  Nullable |
| `paid_at` | `timestamptz` |  Nullable |
| `payment_method` | `text` |  Nullable |
| `stripe_payment_intent_id` | `text` |  Nullable Unique |
| `seller` | `jsonb` |  Nullable |
| `buyer` | `jsonb` |  Nullable |
| `subtotal_cents` | `int4` |  |
| `discount_cents` | `int4` |  |
| `tax_cents` | `int4` |  |
| `total_cents` | `int4` |  |
| `amount_paid_cents` | `int4` |  |
| `currency` | `text` |  |
| `notes` | `text` |  Nullable |
| `pdf_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `invoice_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `invoice_id` | `uuid` |  |
| `description` | `text` |  |
| `quantity` | `numeric` |  |
| `unit_price_cents` | `int4` |  |
| `tax_rate` | `numeric` |  |
| `position` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `document_sequences`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `business_id` | `uuid` | Primary |
| `kind` | `text` | Primary |
| `year` | `int2` | Primary |
| `last_number` | `int4` |  |

## Table `campaigns`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `agency_id` | `uuid` |  |
| `author_id` | `uuid` |  Nullable |
| `channel` | `text` |  |
| `name` | `text` |  |
| `subject` | `text` |  Nullable |
| `preview_text` | `text` |  Nullable |
| `content` | `text` |  |
| `sender_id` | `uuid` |  Nullable |
| `audience` | `jsonb` |  |
| `status` | `text` |  |
| `scheduled_at` | `timestamptz` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `communication_optouts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  Nullable |
| `channel` | `text` |  |
| `address` | `text` |  |
| `scope` | `text` |  |
| `source` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `outbound_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `business_id` | `uuid` |  Nullable |
| `channel` | `text` |  |
| `kind` | `text` |  |
| `template` | `text` |  |
| `to_address` | `text` |  |
| `subject` | `text` |  Nullable |
| `content` | `text` |  Nullable |
| `customer_id` | `uuid` |  Nullable |
| `reservation_id` | `uuid` |  Nullable |
| `order_id` | `uuid` |  Nullable |
| `quote_id` | `uuid` |  Nullable |
| `invoice_id` | `uuid` |  Nullable |
| `campaign_id` | `uuid` |  Nullable |
| `provider` | `text` |  |
| `provider_message_id` | `text` |  Nullable Unique |
| `status` | `text` |  |
| `error` | `text` |  Nullable |
| `idempotency_key` | `text` |  Nullable Unique |
| `sent_at` | `timestamptz` |  Nullable |
| `delivered_at` | `timestamptz` |  Nullable |
| `opened_at` | `timestamptz` |  Nullable |
| `clicked_at` | `timestamptz` |  Nullable |
| `failed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `conversations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `customer_id` | `uuid` |  Nullable |
| `channel` | `text` |  |
| `contact_handle` | `text` |  |
| `external_thread_id` | `text` |  Nullable |
| `subject` | `text` |  Nullable |
| `status` | `text` |  |
| `assigned_to` | `uuid` |  Nullable |
| `last_message_at` | `timestamptz` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `conversation_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `conversation_id` | `uuid` |  |
| `direction` | `text` |  |
| `author_id` | `uuid` |  Nullable |
| `content` | `text` |  |
| `attachments` | `jsonb` |  |
| `is_ai_generated` | `bool` |  |
| `status` | `text` |  |
| `provider` | `text` |  Nullable |
| `provider_message_id` | `text` |  Nullable |
| `external_id` | `text` |  Nullable |
| `error` | `text` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `delivered_at` | `timestamptz` |  Nullable |
| `read_at` | `timestamptz` |  Nullable |
| `failed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `tickets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `business_id` | `uuid` |  Nullable |
| `level` | `text` |  |
| `subject` | `text` |  |
| `category` | `text` |  Nullable |
| `status` | `text` |  |
| `priority` | `text` |  |
| `opened_by` | `uuid` |  Nullable |
| `assigned_to` | `uuid` |  Nullable |
| `last_message_at` | `timestamptz` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `closed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `ticket_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `ticket_id` | `uuid` |  |
| `author_id` | `uuid` |  Nullable |
| `body` | `text` |  |
| `is_internal` | `bool` |  |
| `is_ai_generated` | `bool` |  |
| `attachments` | `jsonb` |  |
| `created_at` | `timestamptz` |  |

## Table `prospects`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `business_name` | `text` |  |
| `contact_name` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `website` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `business_type_id` | `uuid` |  Nullable |
| `source` | `text` |  |
| `status` | `text` |  |
| `lost_reason` | `text` |  Nullable |
| `estimated_value_cents` | `int4` |  Nullable |
| `currency` | `text` |  |
| `assigned_to` | `uuid` |  Nullable |
| `next_action_at` | `timestamptz` |  Nullable |
| `preview_slug` | `text` |  Nullable Unique |
| `preview_sent_at` | `timestamptz` |  Nullable |
| `converted_business_id` | `uuid` |  Nullable |
| `converted_at` | `timestamptz` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `prospect_activities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `prospect_id` | `uuid` |  |
| `kind` | `text` |  |
| `content` | `text` |  Nullable |
| `author_id` | `uuid` |  Nullable |
| `occurred_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `tasks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `business_id` | `uuid` |  Nullable |
| `prospect_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `status` | `text` |  |
| `priority` | `text` |  |
| `labels` | `_text` |  |
| `due_at` | `timestamptz` |  Nullable |
| `done_at` | `timestamptz` |  Nullable |
| `assigned_to` | `uuid` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `position` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `agency_portfolio_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `business_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `slug` | `text` |  |
| `client_name` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `cover_url` | `text` |  Nullable |
| `images` | `jsonb` |  |
| `site_url` | `text` |  Nullable |
| `tags` | `_text` |  |
| `status` | `text` |  |
| `published_at` | `timestamptz` |  Nullable |
| `position` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `expenses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `business_id` | `uuid` |  Nullable |
| `label` | `text` |  |
| `category` | `text` |  Nullable |
| `supplier` | `text` |  Nullable |
| `amount_cents` | `int4` |  |
| `tax_cents` | `int4` |  |
| `currency` | `text` |  |
| `spent_on` | `date` |  |
| `recurrence` | `text` |  |
| `payment_method` | `text` |  Nullable |
| `receipt_url` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `employee_hr`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `employee_id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `employment_type` | `text` |  Nullable |
| `contract_hours_per_week` | `numeric` |  Nullable |
| `hourly_cost_cents` | `int4` |  Nullable |
| `hired_on` | `date` |  Nullable |
| `ended_on` | `date` |  Nullable |
| `note` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `employee_services`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `business_id` | `uuid` |  |
| `employee_id` | `uuid` | Primary |
| `service_id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  |

## Table `shifts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `employee_id` | `uuid` |  |
| `starts_at` | `timestamptz` |  |
| `ends_at` | `timestamptz` |  |
| `break_minutes` | `int4` |  |
| `role_label` | `text` |  Nullable |
| `status` | `text` |  |
| `is_ai_generated` | `bool` |  |
| `note` | `text` |  Nullable |
| `published_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `employee_availabilities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `employee_id` | `uuid` |  |
| `weekday` | `int2` |  |
| `starts_time` | `time` |  |
| `ends_time` | `time` |  |
| `kind` | `text` |  |
| `effective_from` | `date` |  Nullable |
| `effective_to` | `date` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `employee_absences`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `employee_id` | `uuid` |  |
| `starts_on` | `date` |  |
| `ends_on` | `date` |  |
| `kind` | `text` |  |
| `status` | `text` |  |
| `note` | `text` |  Nullable |
| `requested_by` | `uuid` |  Nullable |
| `decided_by` | `uuid` |  Nullable |
| `decided_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `session_id` | `text` |  Unique |
| `visitor_id` | `text` |  Nullable |
| `referrer` | `text` |  Nullable |
| `pages` | `_text` |  |
| `page_count` | `int4` |  |
| `duration_seconds` | `int4` |  Nullable |
| `screen_width` | `int4` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `audit_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `agency_id` | `uuid` |  Nullable |
| `business_id` | `uuid` |  Nullable |
| `actor_id` | `uuid` |  Nullable |
| `action` | `text` |  |
| `entity_table` | `text` |  |
| `entity_id` | `text` |  Nullable |
| `changes` | `jsonb` |  |
| `user_agent` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `google_connexions`

Connexion OAuth à Google Business Profile. Contient un secret : aucune politique RLS, service_role seulement.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `business_id` | `uuid` | Primary |
| `agency_id` | `uuid` |  |
| `account_id` | `text` |  Nullable |
| `location_id` | `text` |  Nullable |
| `refresh_token` | `text` |  Nullable |
| `scopes` | `_text` |  |
| `connecte_par` | `uuid` |  Nullable |
| `connecte_le` | `timestamptz` |  Nullable |
| `derniere_synchro` | `timestamptz` |  Nullable |
| `derniere_erreur` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `verticals`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `text` |  Unique |
| `label` | `text` |  |
| `icon` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `description` | `text` |  Nullable |

## Table `cookie_consents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `visitor_id` | `text` |  |
| `consents` | `jsonb` |  |
| `user_agent` | `text` |  Nullable |
| `ip_hash` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `business_knowledge_base`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `category` | `text` |  Nullable |
| `question` | `text` |  |
| `answer` | `text` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `review_collector_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `rating_given` | `int2` |  |
| `redirected_to_google` | `bool` |  |
| `feedback_text` | `text` |  Nullable |
| `customer_email` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `daily_session_summaries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `date` | `date` |  |
| `total_sessions` | `int4` |  |
| `unique_visitors` | `int4` |  |
| `total_page_views` | `int4` |  |
| `avg_duration_seconds` | `numeric` |  Nullable |
| `avg_pages_per_session` | `numeric` |  Nullable |
| `mobile_sessions` | `int4` |  |
| `desktop_sessions` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `business_integrations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `provider` | `text` |  |
| `account_id` | `text` |  Nullable |
| `refresh_token` | `text` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `website_audits`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_id` | `uuid` |  |
| `url` | `text` |  |
| `performance_score` | `int4` |  Nullable |
| `seo_score` | `int4` |  Nullable |
| `accessibility_score` | `int4` |  Nullable |
| `lcp_seconds` | `numeric` |  Nullable |
| `cls_score` | `numeric` |  Nullable |
| `ai_summary` | `text` |  Nullable |
| `requested_contact` | `bool` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Views

État au 2026-10-12. Les anciennes vues `customer_stats`, `campaign_stats` et `google_connexions_etat` n'existent plus.

Toutes les vues sont en `security_invoker = true` (elles appliquent la RLS de l'utilisateur sur les tables sous-jacentes), **sauf** `v_google_connections_status`, qui s'exécute avec les droits de son propriétaire et filtre elle-même sur `accessible_business_ids('viewer')`.

Le nom d'une personne se compose avec `concat_ws(' ', first_name, last_name)` : la colonne `full_name` a été supprimée de `customers` et de `profiles`.

### View `v_agency_businesses_overview`

Commerces d'une agence avec leur type, leur verticale et l'abonnement de l'agence.

- Sécurité : `security_invoker=true`
- Lecture : `authenticated`, `anon`

| Name | Type |
|------|------|
| `business_id` | `uuid` |
| `agency_id` | `uuid` |
| `business_name` | `text` |
| `slug` | `text` |
| `is_active` | `boolean` |
| `created_at` | `timestamp with time zone` |
| `business_type_label` | `text` |
| `vertical_label` | `text` |
| `subscription_status` | `text` |
| `plan_name` | `text` |

```sql
SELECT b.id AS business_id,
    b.agency_id,
    b.name AS business_name,
    b.slug,
    b.is_active,
    b.created_at,
    bt.label AS business_type_label,
    v.label AS vertical_label,
    sub.status AS subscription_status,
    p.name AS plan_name
   FROM businesses b
     LEFT JOIN business_types bt ON b.business_type_id = bt.id
     LEFT JOIN verticals v ON bt.vertical_id = v.id
     LEFT JOIN agency_subscriptions sub ON b.agency_id = sub.agency_id
     LEFT JOIN agency_plans p ON sub.agency_plan_id = p.id;
```

### View `v_customer_profiles_360`

Statistiques par client : visites terminées, dernière visite, total payé sur ses factures, note moyenne de ses avis. Lue par la page Clients (`lib/v2/data/customers.ts`).

- Sécurité : `security_invoker=true`
- Lecture : `authenticated`, `anon`

| Name | Type |
|------|------|
| `customer_id` | `uuid` |
| `business_id` | `uuid` |
| `first_name` | `text` |
| `last_name` | `text` |
| `email` | `text` |
| `phone` | `text` |
| `created_at` | `timestamp with time zone` |
| `total_reservations` | `bigint` |
| `last_visit_at` | `timestamp with time zone` |
| `total_spent_cents` | `bigint` |
| `average_review_rating` | `numeric(3,2)` |

```sql
SELECT c.id AS customer_id,
    c.business_id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.created_at,
    COALESCE(r.total_reservations, 0::bigint) AS total_reservations,
    r.last_visit_at,
    COALESCE(inv.total_spent_cents, 0::bigint) AS total_spent_cents,
    rev.average_review_rating
   FROM customers c
     LEFT JOIN ( SELECT reservations.customer_id,
            reservations.business_id,
            count(reservations.id) AS total_reservations,
            max(reservations.starts_at) AS last_visit_at
           FROM reservations
          WHERE reservations.status = 'completed'::text
          GROUP BY reservations.customer_id, reservations.business_id) r ON c.id = r.customer_id AND c.business_id = r.business_id
     LEFT JOIN ( SELECT invoices.customer_id,
            invoices.business_id,
            sum(invoices.amount_paid_cents) AS total_spent_cents
           FROM invoices
          WHERE invoices.status = ANY (ARRAY['paid'::text, 'partially_paid'::text])
          GROUP BY invoices.customer_id, invoices.business_id) inv ON c.id = inv.customer_id AND c.business_id = inv.business_id
     LEFT JOIN ( SELECT reviews.customer_id,
            reviews.business_id,
            avg(reviews.rating)::numeric(3,2) AS average_review_rating
           FROM reviews
          GROUP BY reviews.customer_id, reviews.business_id) rev ON c.id = rev.customer_id AND c.business_id = rev.business_id;
```

### View `v_employee_public_directory`

Annuaire des employés actifs, limité aux champs de présentation.

- Sécurité : `security_invoker=true`
- Lecture : `authenticated`, `anon`

| Name | Type |
|------|------|
| `employee_id` | `uuid` |
| `business_id` | `uuid` |
| `first_name` | `text` |
| `last_name` | `text` |
| `avatar_url` | `text` |
| `bio` | `text` |
| `is_active` | `boolean` |

```sql
SELECT id AS employee_id,
    business_id,
    first_name,
    last_name,
    avatar_url,
    bio,
    is_active
   FROM employees e
  WHERE is_active = true;
```

### View `v_google_connections_status`

État de la connexion Google Business Profile d'un commerce, **sans** `refresh_token`. Seul accès côté dashboard : la table `google_connexions` est fermée aux rôles `anon` et `authenticated`.

- Sécurité : `security_invoker=false`
- Lecture : `authenticated`

| Name | Type |
|------|------|
| `business_id` | `uuid` |
| `agency_id` | `uuid` |
| `account_id` | `text` |
| `location_id` | `text` |
| `scopes` | `text[]` |
| `connecte_par` | `uuid` |
| `connecte_le` | `timestamp with time zone` |
| `derniere_synchro` | `timestamp with time zone` |
| `derniere_erreur` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `is_connected` | `boolean` |
| `sync_status` | `text` |

```sql
SELECT business_id,
    agency_id,
    account_id,
    location_id,
    scopes,
    connecte_par,
    connecte_le,
    derniere_synchro,
    derniere_erreur,
    created_at,
    updated_at,
    refresh_token IS NOT NULL AS is_connected,
        CASE
            WHEN refresh_token IS NULL THEN 'disconnected'::text
            WHEN derniere_erreur IS NOT NULL THEN 'error'::text
            ELSE 'active'::text
        END AS sync_status
   FROM google_connexions gc
  WHERE (business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids));
```

### View `v_invoices_summary`

Factures avec le client, le reste à payer et l'indicateur de retard.

- Sécurité : `security_invoker=true`
- Lecture : `authenticated`, `anon`

| Name | Type |
|------|------|
| `invoice_id` | `uuid` |
| `business_id` | `uuid` |
| `invoice_number` | `text` |
| `kind` | `text` |
| `status` | `text` |
| `issued_at` | `timestamp with time zone` |
| `due_date` | `date` |
| `subtotal_cents` | `integer` |
| `discount_cents` | `integer` |
| `total_ht_net_cents` | `integer` |
| `tax_cents` | `integer` |
| `total_ttc_cents` | `integer` |
| `amount_paid_cents` | `integer` |
| `remaining_balance_cents` | `integer` |
| `currency` | `text` |
| `customer_id` | `uuid` |
| `customer_name` | `text` |
| `customer_email` | `text` |
| `is_overdue` | `boolean` |

```sql
SELECT inv.id AS invoice_id,
    inv.business_id,
    inv.number AS invoice_number,
    inv.kind,
    inv.status,
    inv.issued_at,
    inv.due_date,
    inv.subtotal_cents,
    inv.discount_cents,
    inv.subtotal_cents - inv.discount_cents AS total_ht_net_cents,
    inv.tax_cents,
    inv.total_cents AS total_ttc_cents,
    inv.amount_paid_cents,
    inv.total_cents - inv.amount_paid_cents AS remaining_balance_cents,
    inv.currency,
    c.id AS customer_id,
    NULLIF(concat_ws(' '::text, c.first_name, c.last_name), ''::text) AS customer_name,
    c.email AS customer_email,
    (inv.status = ANY (ARRAY['issued'::text, 'partially_paid'::text])) AND inv.due_date < CURRENT_DATE AS is_overdue
   FROM invoices inv
     LEFT JOIN customers c ON inv.customer_id = c.id;
```

### View `v_reservations_detail`

Réservations avec le client, la prestation et l'employé.

- Sécurité : `security_invoker=true`
- Lecture : `authenticated`, `anon`

| Name | Type |
|------|------|
| `reservation_id` | `uuid` |
| `business_id` | `uuid` |
| `starts_at` | `timestamp with time zone` |
| `ends_at` | `timestamp with time zone` |
| `status` | `text` |
| `customer_id` | `uuid` |
| `customer_first_name` | `text` |
| `customer_last_name` | `text` |
| `customer_full_name` | `text` |
| `customer_phone` | `text` |
| `customer_email` | `text` |
| `service_id` | `uuid` |
| `service_name` | `text` |
| `service_duration` | `integer` |
| `service_price_cents` | `integer` |
| `employee_id` | `uuid` |
| `employee_first_name` | `text` |
| `employee_last_name` | `text` |

```sql
SELECT r.id AS reservation_id,
    r.business_id,
    r.starts_at,
    r.ends_at,
    r.status,
    c.id AS customer_id,
    c.first_name AS customer_first_name,
    c.last_name AS customer_last_name,
    NULLIF(concat_ws(' '::text, c.first_name, c.last_name), ''::text) AS customer_full_name,
    c.phone AS customer_phone,
    c.email AS customer_email,
    s.id AS service_id,
    s.name AS service_name,
    s.duration_min AS service_duration,
    s.price_cents AS service_price_cents,
    e.id AS employee_id,
    e.first_name AS employee_first_name,
    e.last_name AS employee_last_name
   FROM reservations r
     LEFT JOIN customers c ON r.customer_id = c.id
     LEFT JOIN services s ON r.service_id = s.id
     LEFT JOIN employees e ON r.employee_id = e.id;
```

### View `v_shifts_overview`

Créneaux de planning avec l'employé et son contrat.

- Sécurité : `security_invoker=true`
- Lecture : `authenticated`, `anon`

| Name | Type |
|------|------|
| `shift_id` | `uuid` |
| `business_id` | `uuid` |
| `starts_at` | `timestamp with time zone` |
| `ends_at` | `timestamp with time zone` |
| `break_minutes` | `integer` |
| `role_label` | `text` |
| `status` | `text` |
| `published_at` | `timestamp with time zone` |
| `is_ai_generated` | `boolean` |
| `employee_id` | `uuid` |
| `employee_first_name` | `text` |
| `employee_last_name` | `text` |
| `employment_type` | `text` |
| `contract_hours_per_week` | `numeric(5,2)` |

```sql
SELECT sh.id AS shift_id,
    sh.business_id,
    sh.starts_at,
    sh.ends_at,
    sh.break_minutes,
    sh.role_label,
    sh.status,
    sh.published_at,
    sh.is_ai_generated,
    e.id AS employee_id,
    e.first_name AS employee_first_name,
    e.last_name AS employee_last_name,
    hr.employment_type,
    hr.contract_hours_per_week
   FROM shifts sh
     JOIN employees e ON sh.employee_id = e.id
     LEFT JOIN employee_hr hr ON e.id = hr.employee_id;
```

## RLS Policies

> Relevé antérieur aux correctifs du 2026-10-12. Depuis :
> - `memberships_agency_manage` (récursive) et `businesses_member_write` sont supprimées ;
> - `conv_messages_public_widget_select` (lecture anonyme des messages) est supprimée ;
> - `businesses_public_widget_select` utilise `business_is_operational(status)`, et le rôle `anon` ne lit que les colonnes de vitrine de `businesses` ;
> - `google_connexions` n'a plus aucune politique ni aucun droit pour `anon` et `authenticated`.
>
> Scripts : `supabase/manual/fix-rls-*.sql`, `business-operational-statuses.sql`, `google-connexions-hide-refresh-token.sql`.


### `google_connexions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `google_connexions_member_manage` | ALL | authenticated | PERMISSIVE | `(has_business_access(business_id) AND has_agency_access(agency_id))` | — |
| `google_connexions_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |

### `prospects`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('member'::text) AS accessible_agency_ids))` | `(agency_id IN ( SELECT accessible_agency_ids('member'::text) AS accessible_agency_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('viewer'::text) AS accessible_agency_ids))` | — |
| `prospects_agency_manage` | ALL | authenticated | PERMISSIVE | `has_agency_access(agency_id)` | — |
| `prospects_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |

### `prospect_activities`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('member'::text) AS accessible_agency_ids))` | `(agency_id IN ( SELECT accessible_agency_ids('member'::text) AS accessible_agency_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('viewer'::text) AS accessible_agency_ids))` | — |
| `prospect_activities_agency_manage` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM prospects p   WHERE ((p.id = prospect_activities.prospect_id) AND has_agency_access(p.agency_id))))` | — |

### `expenses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))` | `(agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))` |
| `expenses_agency_manage` | ALL | authenticated | PERMISSIVE | `has_agency_access(agency_id)` | — |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))` | — |

### `verticals`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `verticals_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | `is_platform_admin()` |
| `verticals_select_public` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `tasks`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('member'::text) AS accessible_agency_ids))` | `(agency_id IN ( SELECT accessible_agency_ids('member'::text) AS accessible_agency_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('viewer'::text) AS accessible_agency_ids))` | — |

### `agency_portfolio_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('member'::text) AS accessible_agency_ids))` | `(agency_id IN ( SELECT accessible_agency_ids('member'::text) AS accessible_agency_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('viewer'::text) AS accessible_agency_ids))` | — |

### `cookie_consents`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `cookie_consents_member_select` | SELECT | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `cookie_consents_public_insert` | INSERT | anon | PERMISSIVE | — | `true` |

### `business_knowledge_base`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `bkb_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `bkb_public_widget_select` | SELECT | anon | PERMISSIVE | `(is_active = true)` | — |

### `review_collector_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `review_collector_member_select` | SELECT | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `review_collector_public_insert` | INSERT | anon | PERMISSIVE | — | `true` |

### `employee_hr`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `employee_hr_business_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | `has_business_access(business_id)` |
| `employee_hr_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |

### `employees`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` |
| `employees_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `employees_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `employees_public_widget_select` | SELECT | anon | PERMISSIVE | `((is_active = true) AND (show_on_site = true))` | — |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `business_hours`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` |
| `hours_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `hours_public_select` | SELECT | anon | PERMISSIVE | `true` | — |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `business_closures`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `closures_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `closures_public_select` | SELECT | anon | PERMISSIVE | `true` | — |
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `businesses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `businesses_member_select` | SELECT | authenticated | PERMISSIVE | `has_business_access(id)` | — |
| `businesses_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `businesses_public_widget_select` | SELECT | anon | PERMISSIVE | `business_is_operational(status)` | — |
| `creation` | INSERT | authenticated | PERMISSIVE | — | `(agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `modification` | UPDATE | authenticated | PERMISSIVE | `(id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` | `(id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` |

### `agencies`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agencies_member_select` | SELECT | authenticated | PERMISSIVE | `has_agency_access(id)` | — |
| `agencies_owner_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM memberships   WHERE ((memberships.profile_id = auth.uid()) AND (memberships.agency_id = agencies.id) AND (memberships.role = ANY (ARRAY['owner'::text, 'administrator'::text])) AND (memberships.is_active = true))))` | — |
| `agencies_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `creation` | INSERT | authenticated | PERMISSIVE | — | `is_platform_admin()` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(id IN ( SELECT visible_agency_ids() AS visible_agency_ids))` | — |
| `modification` | UPDATE | authenticated | PERMISSIVE | `(id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))` | `(id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))` |

### `agency_domains`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agency_domains_agency_manage` | ALL | authenticated | PERMISSIVE | `has_agency_access(agency_id)` | `has_agency_access(agency_id)` |
| `agency_domains_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `agency_domains_select_public` | SELECT | anon, authenticated | PERMISSIVE | `((verified_at IS NOT NULL) OR has_agency_access(agency_id))` | — |

### `business_types`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `business_types_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | `is_platform_admin()` |
| `business_types_select_public` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `lecture` | SELECT | authenticated | PERMISSIVE | `((id = auth.uid()) OR (id IN ( SELECT memberships.profile_id    FROM memberships)))` | — |
| `modification` | UPDATE | authenticated | PERMISSIVE | `(id = auth.uid())` | `(id = auth.uid())` |
| `profiles_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `profiles_self_manage` | ALL | authenticated | PERMISSIVE | `(id = auth.uid())` | `(id = auth.uid())` |
| `profiles_team_select` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (memberships m1      JOIN memberships m2 ON ((m1.agency_id = m2.agency_id)))   WHERE ((m1.profile_id = auth.uid()) AND (m2.profile_id = profiles.id) AND (m1.is_active = true))))` | — |

### `platform_admins`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `lecture` | SELECT | authenticated | PERMISSIVE | `((profile_id = auth.uid()) OR is_platform_admin())` | — |
| `platform_admins_select` | SELECT | authenticated | PERMISSIVE | `is_platform_admin()` | — |

### `memberships`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `lecture` | SELECT | authenticated | PERMISSIVE | `((agency_id IN ( SELECT visible_agency_ids() AS visible_agency_ids)) AND ((business_id IS NULL) OR (business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))))` | — |
| `memberships_agency_select` | SELECT | authenticated | PERMISSIVE | `((profile_id = auth.uid()) OR has_agency_access(agency_id))` | — |
| `memberships_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |

### `invitations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `invitations_agency_manage` | ALL | authenticated | PERMISSIVE | `has_agency_access(agency_id)` | — |
| `invitations_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `invitations_public_select_by_token` | SELECT | anon, authenticated | PERMISSIVE | `((status = 'pending'::text) AND (expires_at > now()))` | — |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(((business_id IS NULL) AND (agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))) OR (business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids)))` | — |

### `agency_email_senders`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agency_email_senders_agency_manage` | ALL | authenticated | PERMISSIVE | `has_agency_access(agency_id)` | `has_agency_access(agency_id)` |
| `agency_email_senders_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |

### `modules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `lecture` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `modules_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `modules_select_all` | SELECT | anon, authenticated | PERMISSIVE | `(is_active = true)` | — |
| `plateforme` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | `is_platform_admin()` |

### `business_type_modules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `bt_modules_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `bt_modules_select_all` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `lecture` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `plateforme` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | `is_platform_admin()` |

### `business_module_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `bms_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `bms_public_widget_select` | SELECT | anon | PERMISSIVE | `(is_enabled = true)` | — |
| `configuration` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `plans`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agence` | ALL | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))` | `(agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `((agency_id IS NULL) OR (agency_id IN ( SELECT visible_agency_ids() AS visible_agency_ids)))` | — |
| `plans_select_public` | SELECT | authenticated | PERMISSIVE | `(is_active = true)` | — |
| `plateforme` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | `is_platform_admin()` |

### `plan_modules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agence` | ALL | authenticated | PERMISSIVE | `(plan_id IN ( SELECT plans.id    FROM plans   WHERE (plans.agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))))` | `(plan_id IN ( SELECT plans.id    FROM plans   WHERE (plans.agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(plan_id IN ( SELECT plans.id    FROM plans))` | — |
| `plan_modules_select_public` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `plateforme` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | `is_platform_admin()` |

### `plan_quotas`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `lecture` | SELECT | authenticated | PERMISSIVE | `(plan_id IN ( SELECT plans.id    FROM plans))` | — |
| `plan_quotas_select_public` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `plateforme` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | `is_platform_admin()` |

### `business_plans`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agence` | ALL | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))` | `(agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))` |
| `bplans_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `business_addons`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agence` | ALL | authenticated | PERMISSIVE | `(agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))` | `(agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids))` |
| `baddons_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `usage_events`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `usage_events_insert_all` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `usage_events_member_select` | SELECT | authenticated | PERMISSIVE | `(((business_id IS NOT NULL) AND has_business_access(business_id)) OR ((agency_id IS NOT NULL) AND has_agency_access(agency_id)))` | — |

### `agency_plan_modules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agency_plan_modules_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `agency_plan_modules_select_public` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `agency_plans`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agency_plans_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | `is_platform_admin()` |
| `agency_plans_select_public` | SELECT | anon, authenticated | PERMISSIVE | `((is_active = true) OR is_platform_admin())` | — |

### `agency_subscriptions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agency_subscriptions_agency_select` | SELECT | authenticated | PERMISSIVE | `has_agency_access(agency_id)` | — |
| `agency_subscriptions_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | `is_platform_admin()` |

### `daily_session_summaries`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Lecture des statistiques par les membres du business` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT m.business_id    FROM memberships m   WHERE ((m.profile_id = auth.uid()) AND (m.is_active = true))))` | — |

### `products`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `products_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `products_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `products_public_widget_select` | SELECT | anon | PERMISSIVE | `(is_active = true)` | — |

### `product_variants`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `variants_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `variants_public_widget_select` | SELECT | anon | PERMISSIVE | `(is_active = true)` | — |

### `talents`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `talents_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `talents_public_select` | SELECT | anon | PERMISSIVE | `true` | — |

### `menu_sections`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `menu_sections_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `menu_sections_public_select` | SELECT | anon | PERMISSIVE | `(is_active = true)` | — |

### `projects`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `projects_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |

### `menu_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `menu_items_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `menu_items_public_select` | SELECT | anon | PERMISSIVE | `(is_available = true)` | — |

### `services`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `services_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `services_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `services_public_widget_select` | SELECT | anon | PERMISSIVE | `(is_active = true)` | — |

### `reviews`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ajout` | INSERT | authenticated | PERMISSIVE | — | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `moderation` | UPDATE | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `reviews_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `reviews_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `reviews_public_widget_insert` | INSERT | anon | PERMISSIVE | — | `true` |
| `reviews_public_widget_select` | SELECT | anon | PERMISSIVE | `(status = 'published'::text)` | — |

### `project_talents`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `project_talents_member_manage` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM projects p   WHERE ((p.id = project_talents.project_id) AND has_business_access(p.business_id))))` | — |

### `blog_posts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `blog_posts_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `blog_posts_public_select` | SELECT | anon, authenticated | PERMISSIVE | `(status = 'published'::text)` | — |
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `website_audits`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Voir les audits de son business` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT m.business_id    FROM memberships m   WHERE ((m.profile_id = auth.uid()) AND (m.is_active = true))))` | — |

### `customers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `customers_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `customers_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `customers_public_widget_insert` | INSERT | anon | PERMISSIVE | — | `true` |
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `reservations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `reservations_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `reservations_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `reservations_public_widget_insert` | INSERT | anon | PERMISSIVE | — | `true` |

### `customer_notes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `customer_notes_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `orders`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ajout` | INSERT | authenticated | PERMISSIVE | — | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `modification` | UPDATE | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `orders_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `orders_public_widget_insert` | INSERT | anon | PERMISSIVE | — | `true` |

### `order_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ajout` | INSERT | authenticated | PERMISSIVE | — | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `modification` | UPDATE | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `order_items_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `order_items_public_widget_insert` | INSERT | anon | PERMISSIVE | — | `true` |

### `invoices`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ajout` | INSERT | authenticated | PERMISSIVE | — | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` |
| `invoices_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `modification` | UPDATE | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` |

### `quotes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `quote_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `invoice_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` |
| `invoice_items_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `document_sequences`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `doc_sequences_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |

### `campaigns`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `campaigns_member_manage` | ALL | authenticated | PERMISSIVE | `(has_business_access(business_id) AND has_agency_access(agency_id))` | — |
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `conversations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `conversations_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `conversations_public_widget_insert` | INSERT | anon | PERMISSIVE | — | `true` |
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `conversation_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `conv_messages_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `conv_messages_public_widget_insert` | INSERT | anon | PERMISSIVE | — | `true` |
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `outbound_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `outbound_messages_member_select` | SELECT | authenticated | PERMISSIVE | `(((business_id IS NOT NULL) AND has_business_access(business_id)) OR ((agency_id IS NOT NULL) AND has_agency_access(agency_id)))` | — |

### `communication_optouts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `optouts_member_select` | SELECT | authenticated | PERMISSIVE | `((business_id IS NULL) OR has_business_access(business_id))` | — |
| `optouts_public_insert` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |

### `tickets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `((business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids)) OR (agency_id IN ( SELECT accessible_agency_ids('member'::text) AS accessible_agency_ids)) OR ((level = 'platform'::text) AND is_platform_admin()))` | `((business_id IN ( SELECT accessible_business_ids('member'::text) AS accessible_business_ids)) OR (agency_id IN ( SELECT accessible_agency_ids('member'::text) AS accessible_agency_ids)) OR ((level = 'platform'::text) AND is_platform_admin()))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `((business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids)) OR (agency_id IN ( SELECT accessible_agency_ids('viewer'::text) AS accessible_agency_ids)) OR ((level = 'platform'::text) AND is_platform_admin()))` | — |
| `tickets_member_manage` | ALL | authenticated | PERMISSIVE | `(has_agency_access(agency_id) OR ((business_id IS NOT NULL) AND has_business_access(business_id)))` | — |
| `tickets_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |

### `ticket_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | INSERT | authenticated | PERMISSIVE | — | `(ticket_id IN ( SELECT tickets.id    FROM tickets))` |
| `lecture` | SELECT | authenticated | PERMISSIVE | `((ticket_id IN ( SELECT tickets.id    FROM tickets)) AND ((NOT is_internal) OR (( SELECT t.agency_id    FROM tickets t   WHERE (t.id = ticket_messages.ticket_id)) IN ( SELECT accessible_agency_ids('viewer'::text) AS accessible_agency_ids)) OR is_platform_admin()))` | — |
| `ticket_messages_member_manage` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM tickets t   WHERE ((t.id = ticket_messages.ticket_id) AND (has_agency_access(t.agency_id) OR ((t.business_id IS NOT NULL) AND has_business_access(t.business_id))))))` | — |

### `employee_services`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ecriture` | ALL | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` | `(business_id IN ( SELECT accessible_business_ids('administrator'::text) AS accessible_business_ids))` |
| `emp_services_member_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `emp_services_public_widget_select` | SELECT | anon | PERMISSIVE | `true` | — |
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |

### `sessions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `lecture` | SELECT | authenticated | PERMISSIVE | `(business_id IN ( SELECT accessible_business_ids('viewer'::text) AS accessible_business_ids))` | — |
| `sessions_member_select` | SELECT | authenticated | PERMISSIVE | `has_business_access(business_id)` | — |
| `sessions_public_insert` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |

### `audit_log`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `audit_log_platform_admin_select` | SELECT | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `lecture` | SELECT | authenticated | PERMISSIVE | `((agency_id IN ( SELECT accessible_agency_ids('administrator'::text) AS accessible_agency_ids)) OR is_platform_admin())` | — |

### `employee_absences`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `employee_absences_business_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | `has_business_access(business_id)` |
| `employee_absences_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |

### `employee_availabilities`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `employee_availabilities_business_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | `has_business_access(business_id)` |
| `employee_availabilities_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |
| `employee_availabilities_select_public` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `shifts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `shifts_business_manage` | ALL | authenticated | PERMISSIVE | `has_business_access(business_id)` | `has_business_access(business_id)` |
| `shifts_platform_admin_all` | ALL | authenticated | PERMISSIVE | `is_platform_admin()` | — |

---

## Changements depuis le 2026-10-12

Ce qui précède décrit la base telle qu'elle était avant ces dates. En particulier, **la liste des politiques RLS ci-dessus est antérieure au durcissement du 2026-10-12** : les politiques `*_member_manage`, `*_agency_manage` et la plupart des `*_public_widget_insert` n'existent plus. L'état de référence est celui que produisent les scripts de `supabase/manual/`, décrits dans `CLAUDE.md` (section 1.3).

### Tables ajoutées

| Table | Rôle | Accès | Script |
|---|---|---|---|
| `api_rate_limits` | Compteur de débit de l'API publique (`key`, `window_start`, `count`) | Clé de service uniquement, par la fonction `rate_limit_hit` | `api-rate-limits.sql` |
| `clarity_daily_metrics` | Chiffres Microsoft Clarity par commerce et par jour (`metrics`, `raw`) | Lecture : membres du commerce. Écriture : clé de service | `clarity-daily-metrics.sql` |

### Colonnes ajoutées

| Table | Colonnes | Rôle | Script |
|---|---|---|---|
| `profiles` | `first_name`, `last_name` | Remplacent `full_name`, supprimée par `drop-full-name-columns.sql` | `profiles-names-status.sql` |
| `profiles` | `status` (`invited`, `pending`, `active`), `last_sign_in_at` | État du compte, tenu par les triggers sur `auth.users` | `profiles-names-status.sql` |
| `quotes` | `buyer`, `seller` (jsonb) | Destinataire saisi sur le devis ; émetteur figé à l'envoi | `quotes-seller-buyer.sql` |
| `customers` | `first_name`, `last_name` | Remplacent `full_name`, supprimée par `drop-full-name-columns.sql` | `customers-first-last-name.sql` |
| `business_types` | `customer_noun`, `service_noun` | Vocabulaire du métier | `business-types-*.sql` |

### Fonctions et triggers ajoutés ou modifiés

| Objet | Rôle |
|---|---|
| `rate_limit_hit(key, limit, window_seconds)` | Compte un appel et dit s'il reste sous la limite |
| `business_accepts_public_writes(business)` | Le commerce existe et est en service (politiques d'insertion anonyme) |
| `business_is_operational(status)` | `active`, `active_client` ou `lead_demo` |
| `handle_new_user()` | Profil avec prénom, nom et statut ; pas d'établissement de démonstration pour un compte invité |
| `handle_user_sign_in()` + trigger `on_auth_user_signed_in` | À chaque connexion : `profiles.status = 'active'`, `last_sign_in_at` recopié |
| `handle_new_user_signup()` | Supprimée (code mort) |

### Usages qui ne se voient pas dans le schéma

- `business_integrations` : une ligne `provider = 'clarity'` par commerce relié (`account_id` = projet, `refresh_token` = jeton d'API).
- `business_module_settings.settings` (public pour les modules activés, aucun secret) : `reservations.notifications`, `quotes.issuer`, `analytics.clarity`, `reviews.google`.
- `plan_quotas`, `business_addons` (`meter = 'sms'`) et `usage_events` : droit mensuel aux SMS et consommation.
- `outbound_messages` : journal de tous les emails et SMS envoyés, avec une clé d'idempotence.
- `profiles` : un utilisateur ne peut modifier que `first_name`, `last_name`, `phone`, `avatar_url`, `locale` (droits de colonne).
