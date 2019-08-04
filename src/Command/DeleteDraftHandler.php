<?php
/**
 *
 *  This file is part of fof/drafts.
 *
 *  Copyright (c) 2019 FriendsOfFlarum..
 *
 *  For the full copyright and license information, please view the license.md
 *  file that was distributed with this source code.
 *
 */

namespace FoF\Drafts\Command;

use Flarum\User\AssertPermissionTrait;
use Flarum\User\Exception\PermissionDeniedException;
use FoF\Drafts\Draft;

class DeleteDraftHandler
{
    use AssertPermissionTrait;

    /**
     * @param DeleteDraft $command
     * @return mixed
     * @throws \Flarum\User\Exception\PermissionDeniedException
     */
    public function handle(DeleteDraft $command)
    {
        $actor = $command->actor;

        $draft = Draft::findOrFail($command->draftId);

        if ($actor->id !== $draft->user_id) throw new PermissionDeniedException();

        $draft->delete();

        return $draft;
    }
}