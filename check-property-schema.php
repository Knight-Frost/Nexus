<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Property columns:\n";
$columns = \Illuminate\Support\Facades\Schema::getColumnListing('properties');
foreach($columns as $col) {
    echo "- $col\n";
}

echo "\nPropertyType enum values:\n";
foreach(\App\Enums\PropertyType::cases() as $type) {
    echo "- {$type->value}\n";
}
