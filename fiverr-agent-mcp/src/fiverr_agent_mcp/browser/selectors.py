"""Fiverr URL paths and DOM locator strategies, centralized.

Fiverr's markup changes over time and A/B tests are common, so every tool
resolves elements through *ordered fallback lists* here rather than hard-coding a
single fragile selector. Prefer semantic locators (roles, placeholders, stable
``data-*`` hooks) and only fall back to structural CSS as a last resort.

Update this one module when the Fiverr UI changes — no tool code should need to.
"""

from __future__ import annotations

from typing import Final

# --------------------------------------------------------------------------- #
# URL paths (joined onto settings.base_url)
# --------------------------------------------------------------------------- #
PATH_HOME: Final = "/"
PATH_LOGIN: Final = "/login"
PATH_LOGOUT: Final = "/logout"
PATH_INBOX: Final = "/inbox"
PATH_CONVERSATION: Final = "/inbox/{conversation_id}"
PATH_BUYER_REQUESTS: Final = "/users/{username}/manage_requests"
PATH_ORDERS: Final = "/orders"
PATH_ORDER_DETAIL: Final = "/orders/{order_id}"
PATH_GIGS: Final = "/users/{username}/manage_gigs"
PATH_GIG_CREATE: Final = "/gig_creation"
PATH_GIG_DETAIL: Final = "/manage_gigs/{gig_id}/edit"
PATH_DASHBOARD: Final = "/seller_dashboard"
PATH_ANALYTICS: Final = "/seller_dashboard/analytics"
PATH_NOTIFICATIONS: Final = "/notifications"


# --------------------------------------------------------------------------- #
# Auth / session
# --------------------------------------------------------------------------- #
# Elements that only render for a logged-in seller — presence == authenticated.
LOGGED_IN_MARKERS: Final = [
    '[data-testid="user-menu"]',
    'header [class*="avatar"]',
    'a[href*="/logout"]',
    'button[aria-label*="notifications" i]',
]

EMAIL_INPUT: Final = [
    'input[name="email"]',
    'input[type="email"]',
    '#email',
    'input[placeholder*="Email" i]',
]
PASSWORD_INPUT: Final = [
    'input[name="password"]',
    'input[type="password"]',
    '#password',
]
CONTINUE_BUTTON: Final = [
    'button:has-text("Continue with email")',
    'button:has-text("Continue")',
]
LOGIN_SUBMIT: Final = [
    'button[type="submit"]:has-text("Sign in")',
    'button:has-text("Sign in")',
    'button:has-text("Log In")',
    'button[type="submit"]',
]
USERNAME_DISPLAY: Final = [
    '[data-testid="user-menu"] [class*="username"]',
    'header [class*="username"]',
]


# --------------------------------------------------------------------------- #
# Inbox
# --------------------------------------------------------------------------- #
CONVERSATION_ROWS: Final = [
    '[data-testid="conversation-list"] [role="listitem"]',
    'ul[class*="conversations"] > li',
    'a[href^="/inbox/"]',
]
CONVERSATION_CONTACT: Final = ['[class*="username"]', '[class*="contact"]', "strong"]
CONVERSATION_SNIPPET: Final = ['[class*="preview"]', '[class*="snippet"]', "p"]
CONVERSATION_UNREAD: Final = ['[class*="unread"]', '[data-unread="true"]']
MESSAGE_ITEMS: Final = [
    '[data-testid="message"]',
    '[class*="message-item"]',
    'div[class*="message"][class*="row"]',
]
MESSAGE_BODY: Final = ['[class*="message-body"]', '[class*="text"]', "p"]
MESSAGE_INPUT: Final = [
    'textarea[placeholder*="message" i]',
    '[data-testid="message-input"] textarea',
    'div[contenteditable="true"]',
]
SEND_BUTTON: Final = [
    'button:has-text("Send")',
    '[data-testid="send-message"]',
    'button[aria-label*="send" i]',
]
ARCHIVE_BUTTON: Final = [
    'button:has-text("Archive")',
    '[data-testid="archive"]',
    'button[aria-label*="archive" i]',
]


# --------------------------------------------------------------------------- #
# Leads / buyer requests
# --------------------------------------------------------------------------- #
LEAD_ROWS: Final = [
    '[data-testid="buyer-request"]',
    '[class*="buyer-request"]',
    'div[class*="request-row"]',
]
LEAD_TITLE: Final = ['[class*="title"]', "h3", "strong"]
LEAD_DESCRIPTION: Final = ['[class*="description"]', "p"]
LEAD_BUDGET: Final = ['[class*="budget"]', '[class*="price"]']
LEAD_DELIVERY: Final = ['[class*="duration"]', '[class*="delivery"]']
SEND_OFFER_BUTTON: Final = [
    'button:has-text("Send offer")',
    'button:has-text("Send Offer")',
    '[data-testid="send-offer"]',
]
OFFER_DESCRIPTION_INPUT: Final = [
    'textarea[name="description"]',
    'textarea[placeholder*="offer" i]',
    'div[contenteditable="true"]',
]
OFFER_PRICE_INPUT: Final = ['input[name="price"]', 'input[placeholder*="price" i]']
OFFER_DELIVERY_INPUT: Final = ['input[name="duration"]', 'select[name="duration"]']


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #
ORDER_ROWS: Final = [
    '[data-testid="order-row"]',
    'table tbody tr',
    'div[class*="order-row"]',
]
ORDER_ID: Final = ['[class*="order-id"]', 'a[href*="/orders/"]']
ORDER_TITLE: Final = ['[class*="gig-title"]', '[class*="title"]']
ORDER_STATUS: Final = ['[class*="status"]', '[class*="state"]']
ORDER_DUE: Final = ['[class*="due"]', '[class*="deadline"]']
ORDER_REQUIREMENTS: Final = [
    '[data-testid="requirements"] li',
    '[class*="requirement"] [class*="answer"]',
]
DELIVER_BUTTON: Final = [
    'button:has-text("Deliver Now")',
    'button:has-text("Deliver")',
    '[data-testid="deliver-order"]',
]
EXTENSION_BUTTON: Final = [
    'button:has-text("Extend delivery")',
    'button:has-text("Request Extension")',
]
CANCEL_BUTTON: Final = [
    'button:has-text("Cancel Order")',
    'button:has-text("Resolve")',
]


# --------------------------------------------------------------------------- #
# Gigs
# --------------------------------------------------------------------------- #
GIG_ROWS: Final = [
    '[data-testid="gig-row"]',
    'table tbody tr',
    'div[class*="gig-card"]',
]
GIG_TITLE: Final = ['[class*="gig-title"]', '[class*="title"]', "h3"]
GIG_STATUS: Final = ['[class*="status"]', '[class*="state"]']
GIG_IMPRESSIONS: Final = ['[class*="impression"]']
GIG_CLICKS: Final = ['[class*="click"]']
GIG_ROW_MENU: Final = ['button[aria-label*="menu" i]', 'button:has-text("...")']
GIG_PAUSE_ACTION: Final = ['button:has-text("Pause")', 'a:has-text("Pause")']
GIG_ACTIVATE_ACTION: Final = ['button:has-text("Activate")', 'a:has-text("Activate")']
GIG_DELETE_ACTION: Final = ['button:has-text("Delete")', 'a:has-text("Delete")']
GIG_TITLE_INPUT: Final = ['input[name="title"]', 'input[placeholder*="title" i]']
GIG_DESCRIPTION_INPUT: Final = [
    'textarea[name="description"]',
    'div[contenteditable="true"]',
]


# --------------------------------------------------------------------------- #
# Analytics / dashboard
# --------------------------------------------------------------------------- #
METRIC_CARDS: Final = [
    '[data-testid="metric-card"]',
    '[class*="metric"]',
    '[class*="stat-card"]',
]
METRIC_LABEL: Final = ['[class*="label"]', '[class*="title"]']
METRIC_VALUE: Final = ['[class*="value"]', '[class*="number"]', "strong"]
EXPORT_BUTTON: Final = ['button:has-text("Export")', '[data-testid="export"]']


# --------------------------------------------------------------------------- #
# Notifications
# --------------------------------------------------------------------------- #
NOTIFICATION_ROWS: Final = [
    '[data-testid="notification"]',
    '[class*="notification-item"]',
    'ul[class*="notifications"] > li',
]
NOTIFICATION_TEXT: Final = ['[class*="text"]', '[class*="content"]', "p"]
NOTIFICATION_UNREAD: Final = ['[class*="unread"]', '[data-unread="true"]']
MARK_READ_BUTTON: Final = [
    'button:has-text("Mark as read")',
    'button:has-text("Mark all as read")',
]
