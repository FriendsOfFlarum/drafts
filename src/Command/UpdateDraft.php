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

class UpdateDraft
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
     * The attributes of the draft.
     *
     * @var array
     */
    public $data;

    /**
     * The IP address of the draft's creator.
     */
    public $ipAddress;

    /**
     * UpdateDraft constructor.
     *
     * @param       $draftId
     * @param User  $actor
     * @param array $data
     */
    public function __construct($draftId, User $actor, array $data, string $ipAddress)
    {
        $this->draftId = $draftId;
        $this->actor = $actor;
        $this->data = $data;
        $this->ipAddress = $ipAddress;
    }
}
