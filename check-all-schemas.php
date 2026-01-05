<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$tables = ['units', 'listings', 'contracts', 'ledger_entries'];

foreach ($tables as $table) {
    echo "\n{$table} columns:\n";
    $columns = \Illuminate\Support\Facades\Schema::getColumnListing($table);
    foreach($columns as $col) {
        echo "- $col\n";
    }
}
