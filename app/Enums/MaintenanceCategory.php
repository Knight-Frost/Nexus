<?php

namespace App\Enums;

/**
 * MaintenanceCategory Enum
 *
 * Classifies the type of maintenance issue reported.
 */
enum MaintenanceCategory: string
{
    case PLUMBING = 'plumbing';
    case ELECTRICAL = 'electrical';
    case APPLIANCE = 'appliance';
    case HVAC = 'hvac';
    case STRUCTURAL = 'structural';
    case GENERAL = 'general';
}
