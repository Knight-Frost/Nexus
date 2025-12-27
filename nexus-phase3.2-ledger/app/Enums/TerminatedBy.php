<?php

namespace App\Enums;

enum TerminatedBy: string
{
    case LANDLORD = 'landlord';
    case TENANT = 'tenant';
    case ADMIN = 'admin';
}
