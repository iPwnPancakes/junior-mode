<?php

namespace App;

enum BaselineAssessmentLevel: string
{
    case NotYetObserved = 'not_yet_observed';
    case Developing = 'developing';
    case Consistent = 'consistent';
    case Independent = 'independent';
}
