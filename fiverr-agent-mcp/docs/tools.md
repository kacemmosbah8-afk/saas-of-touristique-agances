# Tool Reference — Fiverr Agent MCP

Auto-generated from the registered tool metadata (name, description, input schema and annotations). Every tool returns a JSON **string** with a stable envelope:

- success: `{"ok": true, "result": ...}` (list tools also include `count`)
- failure: `{"ok": false, "code": ..., "message": ..., "hint": ...}`
- mutation skipped by `FIVERR_DRY_RUN`: `{"ok": false, "dry_run": true, ...}`

## Contents

- [Account & Session](#account--session)
- [Inbox](#inbox)
- [Leads / Buyer Requests](#leads--buyer-requests)
- [Orders](#orders)
- [Gigs](#gigs)
- [Analytics](#analytics)
- [Notifications](#notifications)
- [AI Features](#ai-features)

## Account & Session

### `login`

Authenticate the browser session with Fiverr.


Restores a persisted session if valid; otherwise signs in with the
``FIVERR_EMAIL`` / ``FIVERR_PASSWORD`` environment variables and saves the
resulting session (encrypted when ``FIVERR_SESSION_KEY`` is set).

Args:
    params (_Empty): No parameters.

Returns:
    str: JSON ``{"ok": true, "result": {"logged_in": bool, "username": str|null,
    "method": "restored"|"credentials", "detail": str}}``.

Possible errors:
    - ``configuration_error``: No session and no credentials configured.
    - ``authentication_error``: Credentials rejected or a 2FA/captcha wall.
    - ``rate_limited``: Anti-bot challenge encountered.

Example:
    login() -> {"ok": true, "result": {"logged_in": true, "method": "restored"}}

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- _none_


### `logout`

Log out of Fiverr and delete the persisted session file.


Args:
    params (_Empty): No parameters.

Returns:
    str: JSON ``{"ok": true, "result": {"logged_in": false, ...}}``.

Possible errors:
    - ``dry_run_blocked``: Skipped because ``FIVERR_DRY_RUN`` is set.

Example:
    logout() -> {"ok": true, "result": {"logged_in": false}}

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- _none_


### `verify_logged_in`

Check whether the current browser session is authenticated.


Navigates to the Fiverr home page and looks for logged-in-only UI markers.

Args:
    params (_Empty): No parameters.

Returns:
    str: JSON with ``logged_in`` (bool) and, when available, ``username``.

Possible errors:
    - ``navigation_error``: Home page could not be loaded.

Example:
    verify_logged_in() -> {"ok": true, "result": {"logged_in": true, "username": "acme"}}

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- _none_


### `save_session`

Persist the current browser session to disk (encrypted if configured).


Args:
    params (_Empty): No parameters.

Returns:
    str: JSON ``{"ok": true, "result": {"path": str, "encrypted": bool}}``.

Possible errors:
    - ``configuration_error``: Session key present but invalid.

Example:
    save_session() -> {"ok": true, "result": {"path": "~/.fiverr-agent-mcp/session.enc"}}

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- _none_


### `restore_session`

Load the persisted session and verify it is still valid.


Use this at the start of a run to avoid re-entering credentials.

Args:
    params (_Empty): No parameters.

Returns:
    str: JSON login-status object; ``logged_in`` is false when no valid
    session file exists.

Possible errors:
    - ``configuration_error``: Encrypted session cannot be decrypted.

Example:
    restore_session() -> {"ok": true, "result": {"logged_in": true, "method": "restored"}}

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- _none_



## Inbox

### `list_messages`

List inbox conversation previews, newest first.


Args:
    params (ListMessagesInput):
        - limit (int): Max conversations, 1-100 (default 20).
        - unread_only (bool): Restrict to unread threads (default false).

Returns:
    str: JSON ``{"ok": true, "count": int, "result": [MessagePreview...]}`` where
    each preview has ``conversation_id``, ``contact``, ``snippet``, ``unread``.

Possible errors:
    - ``session_expired``: Not logged in (run ``login``).
    - ``element_not_found``: Inbox layout not recognized.

Example:
    list_messages(unread_only=true) -> previews of unread threads.

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `limit` _(integer, optional)_ — Maximum conversations to return.
- `unread_only` _(boolean, optional)_ — Only return conversations with unread messages.

### `read_message`

Open a conversation thread and return all its messages in order.


Args:
    params (ConversationInput):
        - conversation_id (str): Thread id from ``list_messages``.

Returns:
    str: JSON with ``conversation_id``, ``contact`` and ``messages`` (each
    ``{sender, body, timestamp, attachments}``).

Possible errors:
    - ``not_found``: Conversation has no readable messages / does not exist.
    - ``session_expired``: Not logged in.

Example:
    read_message(conversation_id="buyer_acme") -> full thread.

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `conversation_id` _(string, required)_ — Conversation id/username (from list_messages).

### `send_message`

Send a new message in a conversation.


Args:
    params (SendMessageInput):
        - conversation_id (str): Target thread.
        - body (str): Message text (1-10000 chars).

Returns:
    str: JSON ``{"ok": true, "result": {"conversation_id", "sent": true, "chars"}}``.

Possible errors:
    - ``not_found``: No message input for the thread.
    - ``dry_run_blocked``: Skipped due to ``FIVERR_DRY_RUN``.

Example:
    send_message(conversation_id="buyer_acme", body="Thanks, on it!")

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- `conversation_id` _(string, required)_ — Conversation id/username (from list_messages).
- `body` _(string, required)_ — Message text to send.

### `reply_to_message`

Reply to the latest message in a conversation.


Functionally posts ``body`` into the given thread (Fiverr threads are linear,
so a reply is a new message in the same conversation).

Args:
    params (SendMessageInput):
        - conversation_id (str): Target thread.
        - body (str): Reply text.

Returns:
    str: JSON ``{"ok": true, "result": {"conversation_id", "sent": true}}``.

Possible errors:
    - ``not_found`` / ``dry_run_blocked`` (see ``send_message``).

Example:
    reply_to_message(conversation_id="buyer_acme", body="Sounds good!")

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- `conversation_id` _(string, required)_ — Conversation id/username (from list_messages).
- `body` _(string, required)_ — Message text to send.

### `archive_message`

Archive a conversation (removes it from the active inbox).


Args:
    params (ConversationInput):
        - conversation_id (str): Thread to archive.

Returns:
    str: JSON ``{"ok": true, "result": {"conversation_id", "archived": true}}``.

Possible errors:
    - ``element_not_found``: Archive control not present.
    - ``dry_run_blocked``: Skipped due to ``FIVERR_DRY_RUN``.

Example:
    archive_message(conversation_id="spam_bot") -> archived.

**Annotations:** read-only: `False` · destructive: `True` · idempotent: `True`

**Inputs:**

- `conversation_id` _(string, required)_ — Conversation id/username (from list_messages).


## Leads / Buyer Requests

### `list_available_leads`

List open buyer requests / leads (LEGACY — Fiverr deprecated this page).


Fiverr retired the public Buyer Requests feature, so this often returns an
empty list on current accounts. To win work now, watch the inbox
(``list_messages``) and respond to buyers with ``send_offer`` (custom offer
from the conversation). Kept for backward compatibility and accounts that
still surface a requests page.

Args:
    params (ListLeadsInput):
        - limit (int): Max leads, 1-100 (default 20).

Returns:
    str: JSON ``{"ok": true, "count": int, "result": [Lead...]}`` where each Lead
    has ``lead_id, title, description, budget, delivery_time``. May be empty.

Possible errors:
    - ``session_expired``: Not logged in.
    - ``element_not_found``: Buyer-requests page not recognized / removed.

Example:
    list_available_leads(limit=10) -> current leads (may be empty).

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `limit` _(integer, optional)_ — Maximum leads to return.

### `analyze_lead`

Score a lead's quality and estimate win probability (heuristic, offline).


Combines budget fit, description richness, professionalism and spam signals.

Args:
    params (AnalyzeLeadInput):
        - title/description/budget (str): Lead content.
        - seller_avg_price (float, optional): For budget-fit scoring.

Returns:
    str: JSON ``LeadScore`` with ``score`` (0-100), ``win_probability`` (0-1),
    ``signals``, ``risks`` and ``recommended`` (bool).

Possible errors:
    - None (pure computation); invalid input is rejected by validation.

Example:
    analyze_lead(description="Need a long-term logo designer, budget $200")
    -> {"score": 78, "recommended": true}

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `lead_id` _(string, optional)_ — Lead id (for reference).
- `title` _(string, optional)_ — Lead title.
- `description` _(string, optional)_ — Full buyer-request text.
- `budget` _(string/null, optional)_ — Stated budget, e.g. '$120'.
- `seller_avg_price` _(number/null, optional)_ — Your average gig price for budget-fit scoring.

### `generate_proposal`

Draft a structured, professional proposal from a raw pitch.


Offline text tool: shapes ``seller_pitch`` into a greeting + body + CTA
tailored to ``lead_description``. The calling agent can further refine it.

Args:
    params (GenerateProposalInput):
        - lead_description (str): The buyer request.
        - seller_pitch (str): Your raw pitch/experience.
        - buyer_name (str, optional): For a personalized greeting.

Returns:
    str: JSON ``{"ok": true, "result": {"proposal": str}}``.

Possible errors:
    - None (pure computation).

Example:
    generate_proposal(lead_description="Need SEO blog posts",
                      seller_pitch="I write ranking content, 200+ posts")

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `lead_description` _(string, required)_ — The buyer request to respond to.
- `seller_pitch` _(string, required)_ — Your raw pitch / relevant experience to shape into a proposal.
- `buyer_name` _(string/null, optional)_ — Buyer name for personalization.

### `send_offer`

Send a custom offer inside a conversation (current Fiverr workflow).


Fiverr retired the public Buyer Requests page, so offers are now created from
within a conversation via the "Create an offer" composer. Point this at the
conversation with the buyer (from ``list_messages``); omit ``gig_id`` for a
custom offer or pass one to base the offer on an existing gig.

Args:
    params (SendOfferInput):
        - conversation_id (str): Conversation to send the offer into.
        - description (str): Offer text.
        - price (float): Offer price (>0).
        - delivery_days (int): Delivery window, 1-90.
        - revisions (int): Included revisions, 0-30 (best-effort).
        - gig_id (str, optional): Base the offer on this gig; omit for custom.

Returns:
    str: JSON ``{"ok": true, "result": {"conversation_id", "sent": true, "price",
    "delivery_days", "revisions", "gig_id", "offer_type": "custom"|"gig"}}``.

Possible errors:
    - ``not_found``: No "Create an offer" control in the conversation.
    - ``session_expired``: Not logged in.
    - ``dry_run_blocked``: Skipped due to ``FIVERR_DRY_RUN``.

Example:
    send_offer(conversation_id="buyer_acme", description="I'll deliver 5 posts",
               price=150, delivery_days=4, revisions=2)

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- `conversation_id` _(string, required)_ — Conversation/username to send the custom offer into.
- `description` _(string, required)_ — Offer description.
- `price` _(number, required)_ — Offer price in account currency.
- `delivery_days` _(integer, required)_ — Delivery time in days.
- `revisions` _(integer, optional)_ — Included revisions (best-effort).
- `gig_id` _(string/null, optional)_ — Optional gig id to base the offer on; omit for a custom offer.


## Orders

### `list_orders`

List the seller's orders, optionally filtered by status.


Args:
    params (ListOrdersInput):
        - status (str, optional): Substring filter, e.g. 'active'.

Returns:
    str: JSON ``{"ok": true, "count": int, "result": [OrderSummary...]}`` with
    ``order_id, title, status, due``.

Possible errors:
    - ``session_expired``: Not logged in.

Example:
    list_orders(status="late") -> only late orders.

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `status` _(string/null, optional)_ — Filter by status substring, e.g. 'active', 'late', 'delivered'.

### `open_order`

Open a single order and return its full detail.


Args:
    params (OrderInput):
        - order_id (str): Order number.

Returns:
    str: JSON ``OrderDetail`` including ``requirements`` and ``messages``.

Possible errors:
    - ``navigation_error`` / ``session_expired``.

Example:
    open_order(order_id="FO123ABC") -> full order detail.

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `order_id` _(string, required)_ — Order number (from list_orders).

### `read_requirements`

Return the buyer-submitted requirement answers for an order.


Args:
    params (OrderInput):
        - order_id (str): Order number.

Returns:
    str: JSON ``{"ok": true, "count": int, "result": [str, ...]}``.

Possible errors:
    - ``navigation_error`` / ``session_expired``.

Example:
    read_requirements(order_id="FO123ABC") -> ["Brand name: Acme", ...]

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `order_id` _(string, required)_ — Order number (from list_orders).

### `send_order_message`

Post a message in an order's thread.


Args:
    params (OrderMessageInput):
        - order_id (str), body (str).

Returns:
    str: JSON ``{"ok": true, "result": {"order_id", "sent": true, "chars"}}``.

Possible errors:
    - ``not_found`` / ``dry_run_blocked``.

Example:
    send_order_message(order_id="FO123ABC", body="First draft attached shortly.")

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- `order_id` _(string, required)_ — Order number (from list_orders).
- `body` _(string, required)_ — Message text.

### `deliver_order`

Deliver an order with a note and optional file attachments.


Args:
    params (DeliverOrderInput):
        - order_id (str), message (str), files (list[str], optional local paths).

Returns:
    str: JSON ``{"ok": true, "result": {"order_id", "delivered": true, "attachments"}}``.

Possible errors:
    - ``element_not_found``: Deliver control missing (order not deliverable).
    - ``dry_run_blocked``.

Example:
    deliver_order(order_id="FO123ABC", message="Final files.", files=["/tmp/logo.zip"])

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- `order_id` _(string, required)_ — Order number (from list_orders).
- `message` _(string, required)_ — Delivery note to the buyer.
- `files` _(array, optional)_ — Local file paths to attach as deliverables.

### `request_extension`

Request a delivery-date extension on an order.


Args:
    params (ExtensionInput):
        - order_id (str), days (int 1-90), reason (str).

Returns:
    str: JSON ``{"ok": true, "result": {"order_id", "extension_requested": true, "days"}}``.

Possible errors:
    - ``element_not_found`` / ``dry_run_blocked``.

Example:
    request_extension(order_id="FO123ABC", days=2, reason="Awaiting brand assets.")

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- `order_id` _(string, required)_ — Order number (from list_orders).
- `days` _(integer, required)_ — Additional delivery days requested.
- `reason` _(string, required)_ — Reason shown to the buyer.

### `cancel_order_request`

Open a cancellation / resolution request on an order.


This starts a cancellation; the buyer must still accept. Destructive because
it can affect completion rate.

Args:
    params (CancelInput):
        - order_id (str), reason (str).

Returns:
    str: JSON ``{"ok": true, "result": {"order_id", "cancellation_requested": true}}``.

Possible errors:
    - ``element_not_found`` / ``dry_run_blocked``.

Example:
    cancel_order_request(order_id="FO123ABC", reason="Buyer unresponsive for 14 days.")

**Annotations:** read-only: `False` · destructive: `True` · idempotent: `False`

**Inputs:**

- `order_id` _(string, required)_ — Order number (from list_orders).
- `reason` _(string, required)_ — Cancellation reason.


## Gigs

### `list_gigs`

List the seller's gigs from the gig manager.


Args:
    params (_Empty): No parameters.

Returns:
    str: JSON ``{"ok": true, "count": int, "result": [GigSummary...]}`` with
    ``gig_id, title, status, impressions, clicks``.

Possible errors:
    - ``session_expired``: Not logged in.

Example:
    list_gigs() -> all gigs with status.

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- _none_


### `open_gig`

Open a gig's edit page and return its detail.


Args:
    params (GigInput):
        - gig_id (str): Gig identifier from ``list_gigs``.

Returns:
    str: JSON ``GigDetail`` with ``title``, ``description``, ``status``.

Possible errors:
    - ``navigation_error`` / ``session_expired``.

Example:
    open_gig(gig_id="0") -> gig detail.

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `gig_id` _(string, required)_ — Gig id/index from list_gigs.

### `create_gig`

Create a new gig draft and fill its initial fields.


Leaves the gig as a draft for review before publishing.

Args:
    params (CreateGigInput):
        - title (str, 15-80 chars), description (str, >=120 chars),
          category (str, optional), tags (list[str], <=5).

Returns:
    str: JSON ``{"ok": true, "result": {"created": true, "title", "status": "draft"}}``.

Possible errors:
    - ``dry_run_blocked`` / ``element_not_found``.

Example:
    create_gig(title="I will design a modern minimalist logo",
               description="<120+ chars>", tags=["logo","branding"])

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- `title` _(string, required)_ — Gig title (Fiverr requires 15-80 chars).
- `description` _(string, required)_ — Gig description (Fiverr minimum ~120 chars).
- `category` _(string/null, optional)_ — Category path, e.g. 'Graphics & Design'.
- `tags` _(array, optional)_ — Up to 5 search tags.

### `update_gig`

Update editable fields (title/description) on an existing gig.


Only provided fields are changed.

Args:
    params (UpdateGigInput):
        - gig_id (str), title (str, optional), description (str, optional).

Returns:
    str: JSON ``{"ok": true, "result": {"gig_id", "updated": true, "fields": [...]}}``.

Possible errors:
    - ``dry_run_blocked`` / ``element_not_found``.

Example:
    update_gig(gig_id="0", title="I will design a premium brand identity kit")

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- `gig_id` _(string, required)_ — Gig id/index from list_gigs.
- `title` _(string/null, optional)_ — New title.
- `description` _(string/null, optional)_ — New description.

### `pause_gig`

Pause an active gig (hides it from search).


Args:
    params (GigInput):
        - gig_id (str).

Returns:
    str: JSON ``{"ok": true, "result": {"gig_id", "status": "paused"}}``.

Possible errors:
    - ``not_found`` / ``dry_run_blocked``.

Example:
    pause_gig(gig_id="0") -> paused.

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- `gig_id` _(string, required)_ — Gig id/index from list_gigs.

### `activate_gig`

Activate a paused gig (returns it to search).


Args:
    params (GigInput):
        - gig_id (str).

Returns:
    str: JSON ``{"ok": true, "result": {"gig_id", "status": "active"}}``.

Possible errors:
    - ``not_found`` / ``dry_run_blocked``.

Example:
    activate_gig(gig_id="0") -> active.

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- `gig_id` _(string, required)_ — Gig id/index from list_gigs.

### `delete_draft`

Delete a draft gig permanently.


Args:
    params (GigInput):
        - gig_id (str): Draft gig to delete.

Returns:
    str: JSON ``{"ok": true, "result": {"gig_id", "deleted": true}}``.

Possible errors:
    - ``not_found`` / ``dry_run_blocked``.

Example:
    delete_draft(gig_id="3") -> deleted.

**Annotations:** read-only: `False` · destructive: `True` · idempotent: `False`

**Inputs:**

- `gig_id` _(string, required)_ — Gig id/index from list_gigs.


## Analytics

### `read_dashboard`

Read the seller dashboard summary metrics.


Args:
    params (_Empty): No parameters.

Returns:
    str: JSON ``AnalyticsSnapshot`` (impressions, clicks, orders, earnings,
    conversion_rate, plus a ``raw`` map of all scraped metric cards).

Possible errors:
    - ``session_expired`` / ``element_not_found``.

Example:
    read_dashboard() -> {"impressions": 1200, "orders": 8, ...}

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- _none_


### `read_conversion_rate`

Read the conversion rate (orders / clicks) from analytics.


Args:
    params (_Empty): No parameters.

Returns:
    str: JSON ``{"ok": true, "result": {"conversion_rate": float|null,
    "orders": int|null, "clicks": int|null}}``.

Possible errors:
    - ``session_expired`` / ``element_not_found``.

Example:
    read_conversion_rate() -> {"conversion_rate": 3.5}

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- _none_


### `read_impressions`

Read total impressions from analytics.


Args:
    params (_Empty): No parameters.

Returns:
    str: JSON ``{"ok": true, "result": {"impressions": int|null, "period": str|null}}``.

Possible errors:
    - ``session_expired`` / ``element_not_found``.

Example:
    read_impressions() -> {"impressions": 4200}

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- _none_


### `read_clicks`

Read total clicks from analytics.


Args:
    params (_Empty): No parameters.

Returns:
    str: JSON ``{"ok": true, "result": {"clicks": int|null, "period": str|null}}``.

Possible errors:
    - ``session_expired`` / ``element_not_found``.

Example:
    read_clicks() -> {"clicks": 350}

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- _none_


### `read_orders`

Read the total orders metric from analytics.


Note: for the list of individual orders use ``list_orders`` instead.

Args:
    params (_Empty): No parameters.

Returns:
    str: JSON ``{"ok": true, "result": {"orders": int|null, "cancellations": int|null}}``.

Possible errors:
    - ``session_expired`` / ``element_not_found``.

Example:
    read_orders() -> {"orders": 8, "cancellations": 1}

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- _none_


### `export_statistics`

Trigger the analytics export and save the file locally.


Args:
    params (ExportInput):
        - destination (str): Local path to save the downloaded file.

Returns:
    str: JSON ``{"ok": true, "result": {"exported": true, "path": str}}``.

Possible errors:
    - ``element_not_found``: No export control available.
    - ``dry_run_blocked``.

Example:
    export_statistics(destination="/tmp/fiverr_stats.csv")

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `False`

**Inputs:**

- `destination` _(string, required)_ — Local file path to save the exported statistics file.


## Notifications

### `list_notifications`

List recent notifications.


Args:
    params (ListNotificationsInput):
        - limit (int): Max notifications, 1-100 (default 20).

Returns:
    str: JSON ``{"ok": true, "count": int, "result": [Notification...]}`` with
    ``notification_id, text, unread, link``.

Possible errors:
    - ``session_expired`` / ``element_not_found``.

Example:
    list_notifications(limit=10) -> ten latest notifications.

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `limit` _(integer, optional)_ — Maximum notifications to return.

### `open_notification`

Open (click) a notification and return its target link.


Args:
    params (NotificationInput):
        - notification_id (str).

Returns:
    str: JSON ``{"ok": true, "result": {"notification_id", "opened": true, "link"}}``.

Possible errors:
    - ``not_found`` / ``dry_run_blocked``.

Example:
    open_notification(notification_id="0")

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `True`

**Inputs:**

- `notification_id` _(string, required)_ — Notification id from list_notifications.

### `mark_as_read`

Mark a notification (or all notifications) as read.


Args:
    params (MarkReadInput):
        - notification_id (str, optional): Omit to mark all as read.

Returns:
    str: JSON ``{"ok": true, "result": {"notification_id"|"all", "read": true}}``.

Possible errors:
    - ``element_not_found`` / ``dry_run_blocked``.

Example:
    mark_as_read() -> marks all as read.

**Annotations:** read-only: `False` · destructive: `False` · idempotent: `True`

**Inputs:**

- `notification_id` _(string/null, optional)_ — Notification id to mark read; omit to mark ALL as read.


## AI Features

### `analyze_client`

Analyze a client's messages for sentiment, risk, and buying signals.


Args:
    params (AnalyzeClientInput):
        - messages (list[str]): Client messages in order.
        - senders (list[str], optional), country (str, optional),
          stated_budget (str, optional).

Returns:
    str: JSON with ``sentiment``, ``risk_level``, ``buying_signals``,
    ``red_flags`` and a nested ``spam`` verdict.

Possible errors:
    - None (pure computation).

Example:
    analyze_client(messages=["Ready to start, please send an offer"])
    -> {"sentiment": "positive", "risk_level": "low"}

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `messages` _(array, required)_ — Conversation/message texts in order.
- `senders` _(array/null, optional)_ — Optional parallel list of sender labels for each message.
- `country` _(string/null, optional)_ — Buyer country, if known.
- `stated_budget` _(string/null, optional)_ — Stated budget, if known.

### `estimate_win_probability`

Estimate the probability (0-1) of winning a lead.


Args:
    params (WinProbInput):
        - description/title/budget (str): Lead content.
        - seller_rating (float 0-5, optional), response_time_hours (float, optional),
          seller_avg_price (float, optional).

Returns:
    str: JSON ``{"ok": true, "result": {"win_probability": float}}``.

Possible errors:
    - None (pure computation).

Example:
    estimate_win_probability(description="Long-term SEO work, $500/mo", seller_rating=4.9)
    -> {"win_probability": 0.71}

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `title` _(string, optional)_ — Lead title.
- `description` _(string, required)_ — Buyer request text.
- `budget` _(string/null, optional)_ — Stated budget, e.g. '$150'.
- `seller_rating` _(number/null, optional)_ — Seller rating (0-5).
- `response_time_hours` _(number/null, optional)_ — Typical response time in hours.
- `seller_avg_price` _(number/null, optional)_ — Seller average price.

### `score_lead`

Score a lead 0-100 with signals and risks (heuristic).


Args:
    params (ScoreLeadInput):
        - description/title/budget (str), seller_avg_price (float, optional).

Returns:
    str: JSON ``LeadScore`` (``score``, ``win_probability``, ``signals``,
    ``risks``, ``recommended``).

Possible errors:
    - None (pure computation).

Example:
    score_lead(description="Cheap quick logo, $5") -> {"score": 22, "recommended": false}

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `title` _(string, optional)_ — Lead title.
- `description` _(string, required)_ — Buyer request text.
- `budget` _(string/null, optional)_ — Stated budget, e.g. '$150'.
- `seller_avg_price` _(number/null, optional)_ — Seller average price.

### `suggest_price`

Suggest a price range for a piece of work.


Args:
    params (SuggestPriceInput):
        - scope_text (str), base_price (float), complexity ('low'|'medium'|'high'),
          currency (str).

Returns:
    str: JSON ``PriceSuggestion`` (``low``, ``recommended``, ``high``, ``rationale``).

Possible errors:
    - None (pure computation).

Example:
    suggest_price(scope_text="Urgent 10-page website", base_price=200, complexity="high")

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `scope_text` _(string, required)_ — Description of the work / buyer request.
- `base_price` _(number, optional)_ — Your baseline package price.
- `complexity` _(string, optional)_ — One of 'low', 'medium', 'high'.
- `currency` _(string, optional)_ — Currency code.

### `rewrite_proposal`

Restructure a proposal draft into a clean, professional template.


Args:
    params (RewriteProposalInput):
        - draft (str), buyer_name (str, optional).

Returns:
    str: JSON ``{"ok": true, "result": {"proposal": str}}``.

Possible errors:
    - None (pure computation).

Example:
    rewrite_proposal(draft="i can do your logo fast", buyer_name="Sam")

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `draft` _(string, required)_ — Raw proposal draft.
- `buyer_name` _(string/null, optional)_ — Buyer name for personalization.

### `improve_reply`

Polish a short reply for clarity and tone.


Args:
    params (ImproveReplyInput):
        - draft (str), tone ('professional'|'friendly'|'concise').

Returns:
    str: JSON ``{"ok": true, "result": {"reply": str}}``.

Possible errors:
    - None (pure computation).

Example:
    improve_reply(draft="ok will do", tone="friendly")

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `draft` _(string, required)_ — Raw reply draft.
- `tone` _(string, optional)_ — 'professional', 'friendly', or 'concise'.

### `detect_spam`

Classify a message/lead as spam/scam with reasons.


Args:
    params (DetectSpamInput):
        - text (str): Content to classify.

Returns:
    str: JSON ``SpamVerdict`` (``is_spam``, ``confidence``, ``reasons``).

Possible errors:
    - None (pure computation).

Example:
    detect_spam(text="Contact me on WhatsApp, pay outside Fiverr")
    -> {"is_spam": true, "confidence": 0.9}

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `text` _(string, required)_ — Message or lead text to classify.

### `summarize_conversation`

Produce an extractive summary of a conversation thread.


Args:
    params (MessagesInput):
        - messages (list[str]): Messages in order.
        - senders (list[str], optional): Parallel sender labels.

Returns:
    str: JSON with ``message_count``, ``participants``, ``key_points``,
    ``action_items``.

Possible errors:
    - None (pure computation).

Example:
    summarize_conversation(messages=["Need it by Friday", "Budget is $300"])

**Annotations:** read-only: `True` · destructive: `False` · idempotent: `True`

**Inputs:**

- `messages` _(array, required)_ — Conversation/message texts in order.
- `senders` _(array/null, optional)_ — Optional parallel list of sender labels for each message.
