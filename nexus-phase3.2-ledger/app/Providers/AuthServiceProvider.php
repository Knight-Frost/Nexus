<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        \App\Models\Property::class => \App\Policies\PropertyPolicy::class,
        \App\Models\Unit::class => \App\Policies\UnitPolicy::class,
        \App\Models\Listing::class => \App\Policies\ListingPolicy::class,
        \App\Models\Contract::class => \App\Policies\ContractPolicy::class, // ADD THIS LINE
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        //
    }
}
