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
use FoF\Drafts\Draft;
use Illuminate\Support\Arr;

class CreateDraftHandler
{
    use Scheduled;

    /**
     * @param CreateDraft $command
     *
     * @throws \Flarum\User\Exception\PermissionDeniedException
     *
     * @return Draft
     */
    public function handle(CreateDraft $command)
    {
        $actor = $command->actor;
        $data = $command->data;
        $attributes = Arr::get($data, 'attributes', []);

        $actor->assertCan('user.saveDrafts');

        $draft = new Draft();

        $draft->user_id = $actor->id;
        $draft->title = Arr::pull($attributes, 'title');
        $draft->content = Arr::pull($attributes, 'content');

        $draft->extra = count($attributes) > 0 ? json_encode($attributes) : null;
        $draft->relationships = json_encode(Arr::get($data, 'relationships', ''));
        $draft->scheduled_for = $this->getScheduledFor($attributes, $actor);
        $draft->updated_at = Carbon::now();
        $draft->ip_address = $command->ipAddress;

        if (Arr::has($attributes, 'clearValidationError')) {
            $draft->scheduled_validation_error = '';
        }

        $draft->save();

        return $draft;
    }
}
