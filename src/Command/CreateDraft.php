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

class CreateDraft
{
    /**
     * The user performing the action.
     *
     * @var User
     */
    public $actor;

    /**
     * The attributes of the new draft.
     *
     * @var array
     */
    public $data;

    /**
     * The IP address of the draft's creator.
     */
    public $ipAddress;

    /**
     * CreateDraft constructor.
     *
     * @param User  $actor
     * @param array $data
     */
    public function __construct(User $actor, array $data, string $ipAddress)
    {
        $this->actor = $actor;
        $this->data = $data;
        $this->ipAddress = $ipAddress;
    }
}
