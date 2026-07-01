<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Add security headers to all API responses
        $middleware->api(append: [
            \App\Http\Middleware\SecurityHeaders::class,
        ]);

        // Register custom middleware aliases
        $middleware->alias([
            'tenant' => \App\Http\Middleware\EnsureTenant::class,
            'landlord' => \App\Http\Middleware\EnsureLandlord::class,
            'admin' => \App\Http\Middleware\EnsureAdmin::class,
            'admin.can' => \App\Http\Middleware\EnsureAdminCan::class,
            'admin.or.landlord' => \App\Http\Middleware\EnsureAdminOrLandlord::class,
            'rate.limit.role' => \App\Http\Middleware\RateLimitByRole::class,
            'metrics' => \App\Http\Middleware\MetricsMiddleware::class,
            'security.headers' => \App\Http\Middleware\SecurityHeaders::class,
        ]);

        // Note: Using token-based authentication (Bearer tokens stored in localStorage)
        // NOT SPA cookie-based authentication, so statefulApi() is not needed.
        // If you need SPA mode with cookies, uncomment the line below and have
        // the frontend call GET /sanctum/csrf-cookie before login.
        // $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // In production, don't expose detailed exception messages
        $exceptions->shouldRenderJsonWhen(function ($request, $e) {
            return $request->expectsJson() || $request->is('api/*');
        });
    })
    ->create();
