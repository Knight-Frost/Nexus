<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Stripe Payment Processing
    |--------------------------------------------------------------------------
    |
    | SECURITY: Never commit real API keys to version control.
    | Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in your .env file.
    |
    */

    'stripe' => [
        'secret' => env('STRIPE_SECRET_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Twilio SMS Service
    |--------------------------------------------------------------------------
    |
    | SECURITY: Never commit real credentials to version control.
    | Set TWILIO_SID, TWILIO_TOKEN, and TWILIO_FROM in your .env file.
    |
    */

    'twilio' => [
        'sid' => env('TWILIO_SID'),
        'token' => env('TWILIO_TOKEN'),
        'from' => env('TWILIO_FROM'),
    ],

    /*
    |--------------------------------------------------------------------------
    | OpenWeatherMap — tenant dashboard weather chip
    |--------------------------------------------------------------------------
    | Free tier: https://openweathermap.org/api
    | Set OPENWEATHER_API_KEY in .env — leave blank to disable the widget.
    */
    'openweather' => [
        'key' => env('OPENWEATHER_API_KEY'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Google OAuth (Socialite)
    |--------------------------------------------------------------------------
    |
    | SECURITY: Never commit real credentials to version control.
    | Leave GOOGLE_CLIENT_ID blank to disable Google sign-in gracefully.
    | The SPA checks GET /auth/providers to decide whether to show the button.
    |
    */
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

];
