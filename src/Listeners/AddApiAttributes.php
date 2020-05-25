<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) 2019 FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE.md
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Listeners;

use Flarum\Api\Event\Serializing;
use Flarum\Api\Serializer\CurrentUserSerializer;
use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Settings\SettingsRepositoryInterface;
use FoF\Drafts\Draft;

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
            $event->attributes['canScheduleDrafts'] = $event->actor->hasPermissionLike('user.scheduleDrafts');
        }

        if ($event->isSerializer(CurrentUserSerializer::class)) {
            $event->attributes['draftCount'] = (int) Draft::where('user_id', $event->actor->id)->count();
        }
    }
}
