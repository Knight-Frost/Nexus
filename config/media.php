<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Public Media Disk
    |--------------------------------------------------------------------------
    |
    | Disk used for publicly accessible assets (property/unit/listing galleries,
    | avatars). Swap to 's3' or 'r2' in production via MEDIA_DISK_PUBLIC env var.
    |
    */

    'disk_public' => env('MEDIA_DISK_PUBLIC', 'public'),

    /*
    |--------------------------------------------------------------------------
    | Private Media Disk
    |--------------------------------------------------------------------------
    |
    | Disk used for private or restricted assets (maintenance evidence, etc.)
    | served only via the controlled media.show route after policy check.
    | Swap to 's3' (with a private ACL) or 'r2' via MEDIA_DISK_PRIVATE env var.
    |
    */

    'disk_private' => env('MEDIA_DISK_PRIVATE', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Upload Limits
    |--------------------------------------------------------------------------
    |
    | max_size_kb: Maximum file size in kilobytes (default 8 MB).
    | allowed_mimes: Comma-separated MIME extension list passed to validation.
    |
    */

    'max_size_kb' => (int) env('MEDIA_MAX_SIZE_KB', 8192),

    'allowed_mimes' => env('MEDIA_ALLOWED_MIMES', 'jpg,jpeg,png,webp'),

    /*
    |--------------------------------------------------------------------------
    | Image Collections
    |--------------------------------------------------------------------------
    |
    | Collections that accept image uploads. Matches MediaCollection enum values.
    |
    */

    'image_collections' => [
        'property_gallery',
        'unit_gallery',
        'listing_gallery',
        'avatar',
        'maintenance_evidence',
    ],

];
