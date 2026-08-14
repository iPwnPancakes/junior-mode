<?php

namespace App;

enum CatalogProposalStatus: string
{
    case Interviewing = 'interviewing';
    case AwaitingReview = 'awaiting_review';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
