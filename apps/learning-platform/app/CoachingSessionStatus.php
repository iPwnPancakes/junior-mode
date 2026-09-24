<?php

namespace App;

enum CoachingSessionStatus: string
{
    case Active = 'active';
    case Concluded = 'concluded';
}
