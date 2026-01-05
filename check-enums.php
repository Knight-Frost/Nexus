<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Check ledger entry types
$files = glob('app/Enums/*Type.php');
foreach ($files as $file) {
    echo basename($file, '.php') . "\n";
}

echo "\nChecking for ledger-related enums:\n";
$allEnums = glob('app/Enums/*.php');
foreach ($allEnums as $file) {
    $name = basename($file, '.php');
    if (stripos($name, 'ledger') !== false || stripos($name, 'payment') !== false) {
        echo "- $name\n";
        $class = "App\\Enums\\$name";
        if (class_exists($class)) {
            foreach ($class::cases() as $case) {
                echo "  - {$case->value}\n";
            }
        }
    }
}
