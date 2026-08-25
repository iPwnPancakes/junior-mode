<?php

namespace App;

enum CoachingPriorityStatus: string
{
    case Active = 'active';
    case Closed = 'closed';
    case SufficientlyDemonstrated = 'sufficiently_demonstrated';
    case Replaced = 'replaced';
}
