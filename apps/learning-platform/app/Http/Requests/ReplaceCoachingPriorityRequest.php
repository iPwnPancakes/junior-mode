<?php

namespace App\Http\Requests;

use App\CoachingPriorityStatus;
use App\Models\CoachingPriority;

class ReplaceCoachingPriorityRequest extends StoreCoachingPriorityRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $priority = $this->route('coachingPriority');

        return $priority instanceof CoachingPriority
            && $priority->status === CoachingPriorityStatus::Active
            && parent::authorize();
    }
}
