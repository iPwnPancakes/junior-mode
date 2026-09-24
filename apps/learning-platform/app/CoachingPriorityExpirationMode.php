<?php

namespace App;

enum CoachingPriorityExpirationMode: string
{
    case DefaultDuration = 'default_duration';
    case CustomDate = 'custom_date';
    case UntilRemoved = 'until_removed';
}
