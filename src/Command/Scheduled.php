<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Command;

use Carbon\Carbon;
use Flarum\User\User;
use Illuminate\Support\Arr;

trait Scheduled
{
    protected function getScheduledFor(array $attributes, User $actor): ?Carbon
    {
        $scheduled = Arr::get($attributes, 'scheduledFor');

        if ($scheduled && $actor->can('user.scheduleDrafts')) {
            return Carbon::parse($scheduled);
        }

        return null;
    }
}
