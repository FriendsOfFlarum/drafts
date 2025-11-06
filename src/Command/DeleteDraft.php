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

use Flarum\User\User;

class DeleteDraft
{
    /**
     * DeleteDraft constructor.
     *
     */
    public function __construct(public $draftId, public User $actor)
    {
    }
}
