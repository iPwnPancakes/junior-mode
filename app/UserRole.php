<?php

namespace App;

enum UserRole: string
{
    case Mentor = 'mentor';
    case Learner = 'learner';
}
