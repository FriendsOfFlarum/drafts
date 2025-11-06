<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

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
