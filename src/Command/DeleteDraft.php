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

use Flarum\User\User;

class DeleteDraft
{
    /**
     * The ID of the draft.
     *
     * @var int
     */
    public $draftId;

    /**
     * The user performing the action.
     *
     * @var User
     */
    public $actor;

    /**
     * DeleteDraft constructor.
     *
     * @param $draftId
     * @param User $actor
     */
    public function __construct($draftId, User $actor)
    {
        $this->draftId = $draftId;
        $this->actor = $actor;
    }
}
