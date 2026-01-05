<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Contract IDs:\n";
foreach(\App\Models\Contract::all() as $c) {
    echo "- {$c->id}\n";
}

echo "\nLedger Entry IDs:\n";
foreach(\App\Models\LedgerEntry::all() as $l) {
    echo "- {$l->id}\n";
}

echo "\nTest URLs that should work:\n";
$contract = \App\Models\Contract::first();
if ($contract) {
    echo "GET /api/landlord/contracts/{$contract->id}\n";
}
