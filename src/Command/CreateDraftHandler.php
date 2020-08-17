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
        unset($data['attributes']['content']);
        $draft->extra = count($data['attributes']) > 0 ? json_encode($data['attributes']) : '';
        $draft->relationships = isset($data['relationships']) ? json_encode($data['relationships']) : json_encode('');
        $draft->scheduled_for = isset($data['attributes']['scheduledFor']) && $actor->can('user.scheduleDrafts') ? Carbon::parse($data['attributes']['scheduledFor']) : null;
        $draft->updated_at = Carbon::now();
        $draft->ip_address = $command->ipAddress;

        if (array_key_exists('clearValidationError', $data['attributes'])) {
            $draft->scheduled_validation_error = '';
        }

        $draft->save();

        return $draft;
    }
}
