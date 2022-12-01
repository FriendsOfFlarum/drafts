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
use Flarum\User\Exception\PermissionDeniedException;
use FoF\Drafts\Draft;
use Illuminate\Support\Arr;

class UpdateDraftHandler
{
    use Scheduled;

    /**
     * @param UpdateDraft $command
     *
     * @throws PermissionDeniedException
     *
     * @return mixed
     */
    public function handle(UpdateDraft $command)
    {
        $actor = $command->actor;
        $data = $command->data;

        $draft = Draft::findOrFail($command->draftId);

        if (intval($actor->id) !== intval($draft->user_id)) {
            throw new PermissionDeniedException();
        }

        $actor->assertCan('user.saveDrafts');

        $attributes = Arr::get($data, 'attributes', []);

        if ($title = Arr::get($attributes, 'title')) {
            $draft->title = $title;
        }

        if ($content = Arr::get($attributes, 'content')) {
            $draft->content = $content;
        }

        if ($extra = Arr::get($attributes, 'content.extra')) {
            $draft->extra = json_encode($extra);
        }

        if ($relationships = Arr::get($data, 'relationships')) {
            $draft->relationships = json_encode($relationships);
        }

        if (Arr::has($attributes, 'clearValidationError')) {
            $draft->scheduled_validation_error = '';
        }

        $draft->scheduled_for = $this->getScheduledFor($attributes, $actor);
        $draft->ip_address = $command->ipAddress;
        $draft->updated_at = Carbon::now();

        $draft->save();

        return $draft;
    }
}
