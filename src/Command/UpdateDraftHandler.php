<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) 2019 FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE.md
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Command;

use Carbon\Carbon;
use Flarum\User\AssertPermissionTrait;
use Flarum\User\Exception\PermissionDeniedException;
use FoF\Drafts\Draft;

class UpdateDraftHandler
{
    use AssertPermissionTrait;

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

        $this->assertCan($actor, 'user.saveDrafts');

        if (isset($data['attributes']['title'])) {
            $draft->title = $data['attributes']['title'];
        }

        if (isset($data['attributes']['content'])) {
            $draft->content = $data['attributes']['content'];
        }

        if (count($data['attributes']) > 0) {
            $draft->extra = json_encode($data['attributes']['extra']);
        }

        if (isset($data['relationships'])) {
            $draft->relationships = json_encode($data['relationships']);
        }

        if (array_key_exists('clearValidationError', $data['attributes'])) {
            $draft->scheduled_validation_error = '';
        }

        $draft->scheduled_for = isset($data['attributes']['scheduledFor']) && $actor->can('user.scheduleDrafts') ? Carbon::parse($data['attributes']['scheduledFor']) : null;
        $draft->ip_address = $command->ipAddress;
        $draft->updated_at = Carbon::now();

        $draft->save();

        return $draft;
    }
}
