<?php

namespace App\Enums;

/**
 * MaintenancePriority Enum
 *
 * Indicates urgency for a maintenance request.
 */
enum MaintenancePriority: string
{
    case LOW = 'low';
    case MEDIUM = 'medium';
    case HIGH = 'high';
    case URGENT = 'urgent';
}
