<?php

/*
|--------------------------------------------------------------------------
| Brand Configuration
|--------------------------------------------------------------------------
|
| The SINGLE source of truth for every user-facing brand string the backend
| emits (emails, notifications, SMS, console output, seeded copy). To rename
| the product, change the BRAND_* env values — do NOT hardcode the app name in
| mailables, Blade templates, notifications, or services. Read these via
| config('brand.*').
|
*/

return [
    // Full product name shown to users.
    'display_name' => env('BRAND_DISPLAY_NAME', env('APP_NAME', 'Wyncrest')),

    // Compact name for tight contexts (e.g. SMS prefix).
    'short_name' => env('BRAND_SHORT_NAME', env('BRAND_DISPLAY_NAME', env('APP_NAME', 'Wyncrest'))),

    // Legal entity name for legal/footer copy.
    'legal_name' => env('BRAND_LEGAL_NAME', env('BRAND_DISPLAY_NAME', 'Wyncrest')),

    // Name used when referring to the support team.
    'support_name' => env('BRAND_SUPPORT_NAME', 'Wyncrest Support'),

    // From-name on outbound mail (falls back to the standard Laravel mail var).
    'email_from_name' => env('MAIL_FROM_NAME', env('BRAND_DISPLAY_NAME', 'Wyncrest')),

    // Short product descriptor.
    'descriptor' => env('BRAND_DESCRIPTOR', 'Property Platform'),

    // Positioning lines.
    'tagline' => env('BRAND_TAGLINE', 'A higher standard for modern renting.'),
    'secondary_tagline' => env('BRAND_SECONDARY_TAGLINE', 'Every lease, payment, and record in trusted order.'),
];
