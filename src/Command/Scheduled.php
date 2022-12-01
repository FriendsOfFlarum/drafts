<?php

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
