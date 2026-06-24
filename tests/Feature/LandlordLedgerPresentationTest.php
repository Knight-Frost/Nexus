<?php

namespace Tests\Feature;

use App\Enums\LedgerStatus;
use App\Enums\LedgerType;
use App\Models\Contract;
use App\Models\LedgerEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * LandlordLedgerPresentationTest
 *
 * Feature 3: ledger entries are decorated with a deterministic `reference` and
 * a running `balance_after_cents` computed chronologically per contract.
 */
class LandlordLedgerPresentationTest extends TestCase
{
    use RefreshDatabase;

    protected User $landlord;

    protected Contract $contract;

    protected function setUp(): void
    {
        parent::setUp();

        $this->landlord = User::factory()->landlord()->create();
        $this->contract = Contract::factory()->active()->create([
            'landlord_id' => $this->landlord->id,
        ]);
    }

    private function entry(array $overrides): LedgerEntry
    {
        return LedgerEntry::factory()->create(array_merge([
            'contract_id' => $this->contract->id,
            'landlord_id' => $this->landlord->id,
            'tenant_id' => $this->contract->tenant_id,
        ], $overrides));
    }

    public function test_reference_format_and_balance_reconcile_to_zero(): void
    {
        // Rent obligation created first, then a full payment.
        $rent = $this->entry([
            'type' => LedgerType::RENT,
            'status' => LedgerStatus::PAID,
            'amount_cents' => 150000,
            'due_date' => now()->subDays(5),
            'created_at' => now()->subDays(5),
        ]);
        $payment = $this->entry([
            'type' => LedgerType::PAYMENT,
            'status' => LedgerStatus::PAID,
            'amount_cents' => 150000,
            'due_date' => now()->subDays(1),
            'created_at' => now()->subDays(1),
        ]);

        Sanctum::actingAs($this->landlord, [], 'sanctum');

        $response = $this->getJson('/api/landlord/ledger');
        $response->assertStatus(200);

        $byId = collect($response->json())->keyBy('id');

        // Reference: deterministic prefix + Ymd of due_date + 6 uppercase id chars.
        $expectedRentRef = 'INV-'.now()->subDays(5)->format('Ymd').'-'.strtoupper(substr($rent->id, 0, 6));
        $expectedPayRef = 'RCPT-'.now()->subDays(1)->format('Ymd').'-'.strtoupper(substr($payment->id, 0, 6));

        $this->assertSame($expectedRentRef, $byId[$rent->id]['reference']);
        $this->assertSame($expectedPayRef, $byId[$payment->id]['reference']);

        // Running balance: rent +150000, then payment brings it to 0.
        $this->assertSame(150000, $byId[$rent->id]['balance_after_cents']);
        $this->assertSame(0, $byId[$payment->id]['balance_after_cents']);
    }

    public function test_show_returns_inclusive_balance(): void
    {
        $rent = $this->entry([
            'type' => LedgerType::RENT,
            'status' => LedgerStatus::PENDING,
            'amount_cents' => 80000,
            'due_date' => now()->subDays(3),
            'created_at' => now()->subDays(3),
        ]);
        $payment = $this->entry([
            'type' => LedgerType::PAYMENT,
            'status' => LedgerStatus::PAID,
            'amount_cents' => 30000,
            'due_date' => now()->subDay(),
            'created_at' => now()->subDay(),
        ]);

        Sanctum::actingAs($this->landlord, [], 'sanctum');

        $this->getJson("/api/landlord/ledger/{$rent->id}")
            ->assertStatus(200)
            ->assertJsonPath('balance_after_cents', 80000)
            ->assertJsonPath('reference', 'INV-'.now()->subDays(3)->format('Ymd').'-'.strtoupper(substr($rent->id, 0, 6)));

        $this->getJson("/api/landlord/ledger/{$payment->id}")
            ->assertStatus(200)
            ->assertJsonPath('balance_after_cents', 50000); // 80000 - 30000
    }

    public function test_waived_obligation_does_not_change_balance(): void
    {
        $waived = $this->entry([
            'type' => LedgerType::RENT,
            'status' => LedgerStatus::WAIVED,
            'amount_cents' => 60000,
            'due_date' => now()->subDays(2),
            'created_at' => now()->subDays(2),
        ]);

        Sanctum::actingAs($this->landlord, [], 'sanctum');

        $this->getJson("/api/landlord/ledger/{$waived->id}")
            ->assertStatus(200)
            ->assertJsonPath('balance_after_cents', 0);
    }
}
