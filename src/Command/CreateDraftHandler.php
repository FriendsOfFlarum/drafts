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
use FoF\Drafts\Draft;

class CreateDraftHandler
{
    use AssertPermissionTrait;

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

        $this->assertCan($actor, 'user.saveDrafts');

        $draft = new Draft();

        $draft->user_id = $actor->id;
        $draft->title = isset($data['attributes']['title']) ? $data['attributes']['title'] : '';
        $draft->content = isset($data['attributes']['content']) ? $data['attributes']['content'] : '';
        $draft->relationships = isset($data['relationships']) ? json_encode($data['relationships']) : json_encode('');
        $draft->updated_at = Carbon::now();

        $draft->save();

        return $draft;
    }
}
