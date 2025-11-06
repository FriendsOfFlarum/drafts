<?php

namespace FoF\Drafts\Access;

use Flarum\User\User;
use Illuminate\Database\Eloquent\Builder;

class ScopeDraftVisibility
{
    public function __invoke(User $actor, Builder $query): void
    {
        $query->where('user_id', $actor->id);
    }
}
