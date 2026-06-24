<?php

namespace App\Enums;

enum MediaVisibility: string
{
    case Public = 'public';
    case Private = 'private';
    case Restricted = 'restricted';
}
