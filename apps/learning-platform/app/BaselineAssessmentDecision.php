<?php

namespace App;

enum BaselineAssessmentDecision: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
