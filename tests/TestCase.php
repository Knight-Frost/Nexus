<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Carbon;

abstract class TestCase extends BaseTestCase
{
    /**
     * Always restore real time after each test.
     *
     * why: tests that call Carbon::setTestNow() (e.g. LedgerAutomationTest) reset it
     * inline — but a failing assertion between freeze and reset would leak frozen time
     * into later tests, making date-window assertions (PlatformAnalyticsTest) flaky.
     * Resetting here makes time isolation unconditional. (June 2026)
     */
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }
}
