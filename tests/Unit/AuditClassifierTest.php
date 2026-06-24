<?php

namespace Tests\Unit;

use App\Support\Audit\AuditClassifier;
use PHPUnit\Framework\TestCase;

/**
 * AuditClassifierTest
 *
 * Pure unit tests — no DB, no Laravel app boot.
 * All methods are static so they can be tested in isolation.
 */
class AuditClassifierTest extends TestCase
{
    // =========================================================================
    // area()
    // =========================================================================

    public function test_area_access(): void
    {
        $this->assertSame('Access', AuditClassifier::area('admin_login'));
        $this->assertSame('Access', AuditClassifier::area('login_rate_limited'));
    }

    public function test_area_users(): void
    {
        $this->assertSame('Users', AuditClassifier::area('account_suspended'));
        $this->assertSame('Users', AuditClassifier::area('identity_verified'));
    }

    public function test_area_listings(): void
    {
        $this->assertSame('Listings', AuditClassifier::area('listing_published'));
        $this->assertSame('Listings', AuditClassifier::area('listing_rejected'));
    }

    public function test_area_properties(): void
    {
        $this->assertSame('Properties', AuditClassifier::area('property_created'));
        $this->assertSame('Properties', AuditClassifier::area('unit_deleted'));
    }

    public function test_area_contracts(): void
    {
        $this->assertSame('Contracts', AuditClassifier::area('contract_accepted'));
        $this->assertSame('Contracts', AuditClassifier::area('contract_force_terminated'));
    }

    public function test_area_ledger(): void
    {
        $this->assertSame('Ledger', AuditClassifier::area('payment_recorded'));
        $this->assertSame('Ledger', AuditClassifier::area('late_fee_applied'));
        $this->assertSame('Ledger', AuditClassifier::area('ledger_entry_marked_overdue'));
    }

    public function test_area_applications(): void
    {
        $this->assertSame('Applications', AuditClassifier::area('application_submitted'));
    }

    public function test_area_maintenance(): void
    {
        $this->assertSame('Maintenance', AuditClassifier::area('maintenance_request_created'));
    }

    public function test_area_documents(): void
    {
        $this->assertSame('Documents', AuditClassifier::area('document_uploaded'));
    }

    public function test_area_messages(): void
    {
        $this->assertSame('Messages', AuditClassifier::area('message_sent'));
    }

    public function test_area_settings(): void
    {
        $this->assertSame('Settings', AuditClassifier::area('feature_enabled'));
        $this->assertSame('Settings', AuditClassifier::area('feature_disabled'));
    }

    public function test_area_unknown_falls_back_to_system(): void
    {
        $this->assertSame('System', AuditClassifier::area('some_unknown_action'));
        $this->assertSame('System', AuditClassifier::area(''));
    }

    // =========================================================================
    // actionLabel()
    // =========================================================================

    public function test_action_label_humanizes_slugs(): void
    {
        $this->assertSame('Account suspended', AuditClassifier::actionLabel('account_suspended'));
        $this->assertSame('Listing published', AuditClassifier::actionLabel('listing_published'));
        $this->assertSame('Admin login', AuditClassifier::actionLabel('admin_login'));
        $this->assertSame('Payment recorded', AuditClassifier::actionLabel('payment_recorded'));
    }

    public function test_action_label_single_word(): void
    {
        $this->assertSame('Login', AuditClassifier::actionLabel('login'));
    }

    // =========================================================================
    // status()
    // =========================================================================

    public function test_status_critical(): void
    {
        $status = AuditClassifier::status('critical');
        $this->assertSame('needs_review', $status['key']);
        $this->assertSame('Needs review', $status['label']);
    }

    public function test_status_warning(): void
    {
        $status = AuditClassifier::status('warning');
        $this->assertSame('review_suggested', $status['key']);
        $this->assertSame('Review suggested', $status['label']);
    }

    public function test_status_info(): void
    {
        $status = AuditClassifier::status('info');
        $this->assertSame('routine', $status['key']);
        $this->assertSame('Routine', $status['label']);
    }

    public function test_status_unknown_falls_back_to_routine(): void
    {
        $status = AuditClassifier::status('mystery');
        $this->assertSame('routine', $status['key']);
    }

    // =========================================================================
    // device()
    // =========================================================================

    public function test_device_macos_chrome(): void
    {
        $ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
        $this->assertSame('macOS · Chrome', AuditClassifier::device($ua));
    }

    public function test_device_windows_edge(): void
    {
        $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0';
        $this->assertSame('Windows · Edge', AuditClassifier::device($ua));
    }

    public function test_device_ios_safari(): void
    {
        $ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
        $this->assertSame('iOS · Safari', AuditClassifier::device($ua));
    }

    public function test_device_android_chrome(): void
    {
        $ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
        $this->assertSame('Android · Chrome', AuditClassifier::device($ua));
    }

    public function test_device_linux_firefox(): void
    {
        $ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0';
        $this->assertSame('Linux · Firefox', AuditClassifier::device($ua));
    }

    public function test_device_null_returns_null(): void
    {
        $this->assertNull(AuditClassifier::device(null));
    }

    public function test_device_empty_string_returns_null(): void
    {
        $this->assertNull(AuditClassifier::device(''));
    }

    public function test_device_unrecognisable_ua_returns_null(): void
    {
        $this->assertNull(AuditClassifier::device('curl/7.64.1'));
    }

    // =========================================================================
    // actorRole()
    // =========================================================================

    public function test_actor_role_null_type_is_system(): void
    {
        $this->assertSame('system', AuditClassifier::actorRole(null, null));
    }

    public function test_actor_role_admin_class(): void
    {
        $this->assertSame('admin', AuditClassifier::actorRole(\App\Models\Admin::class, null));
    }

    public function test_actor_role_user_tenant(): void
    {
        $this->assertSame('tenant', AuditClassifier::actorRole(\App\Models\User::class, 'tenant'));
    }

    public function test_actor_role_user_landlord(): void
    {
        $this->assertSame('landlord', AuditClassifier::actorRole(\App\Models\User::class, 'landlord'));
    }

    public function test_actor_role_user_unknown_user_type(): void
    {
        $this->assertSame('user', AuditClassifier::actorRole(\App\Models\User::class, null));
    }

    // =========================================================================
    // areaToActions() reverse map
    // =========================================================================

    public function test_area_to_actions_reverse_map_is_consistent(): void
    {
        $reverse = AuditClassifier::areaToActions();

        // Every action in AREAS must appear in the reverse map under the correct area
        foreach (AuditClassifier::AREAS as $action => $area) {
            $this->assertArrayHasKey($area, $reverse);
            $this->assertContains($action, $reverse[$area]);
        }
    }
}
