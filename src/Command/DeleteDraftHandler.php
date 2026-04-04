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

use Flarum\User\Exception\PermissionDeniedException;
use FoF\Drafts\Draft;

class DeleteDraftHandler
{
    /**
     * @param DeleteDraft $command
     *
     * @throws \Flarum\User\Exception\PermissionDeniedException
     *
     * @return mixed
     */
    public function handle(DeleteDraft $command)
    {
        $actor = $command->actor;

        $draft = Draft::find($command->draftId);

        // Draft can already be gone in async cleanup flows. Treat delete as idempotent.
        if (!$draft) {
            return null;
        }

        if (strval($actor->id) !== strval($draft->user_id)) {
            throw new PermissionDeniedException();
        }
        $draft->delete();

        return $draft;
    }
}
