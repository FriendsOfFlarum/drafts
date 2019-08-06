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

        if ($actor->id !== $draft->user_id) {
            throw new PermissionDeniedException();
        }
        $this->assertCan($actor, 'user.saveDrafts');

        $draft->title = isset($data['attributes']['title']) ? $data['attributes']['title'] : '';
        $draft->content = isset($data['attributes']['content']) ? $data['attributes']['content'] : '';
        $draft->relationships = isset($data['relationships']) ? json_encode($data['relationships']) : json_encode('');
        $draft->updated_at = Carbon::now();

        $draft->save();

        return $draft;
    }
}
