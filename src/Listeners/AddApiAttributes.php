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

namespace FoF\Drafts\Listeners;

use Flarum\Api\Event\Serializing;
use Flarum\Api\Serializer\CurrentUserSerializer;
use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Api\Serializer\PostSerializer;
use Flarum\Api\Serializer\UserSerializer;
use FoF\UserRequest\UsernameRequest;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\User;

class AddApiAttributes
{
    /**
     * @var SettingsRepositoryInterface
     */
    protected $settings;

    /**
     * @param SettingsRepositoryInterface $settings
     */
    public function __construct(SettingsRepositoryInterface $settings)
    {
        $this->settings = $settings;
    }

    public function handle(Serializing $event)
    {
        if ($event->isSerializer(ForumSerializer::class)) {
            $event->attributes['canSaveDrafts'] = $event->actor->hasPermissionLike('user.saveDrafts');
        }
    }
}