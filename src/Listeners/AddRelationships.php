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

use Flarum\Api\Controller;
use Flarum\Api\Event\WillGetData;
use Flarum\Api\Serializer\UserSerializer;
use Flarum\Event\GetApiRelationship;
use Flarum\Event\GetModelRelationship;
use Flarum\User\User;
use FoF\Drafts\Api\Serializer\DraftSerializer;
use FoF\Drafts\Draft;
use Illuminate\Contracts\Events\Dispatcher;

class AddRelationships
{
    /**
     * @param Dispatcher $events
     */
    public function subscribe(Dispatcher $events)
    {
        $events->listen(GetModelRelationship::class, [$this, 'getModelRelationship']);
        $events->listen(GetApiRelationship::class, [$this, 'getApiRelationship']);
        $events->listen(WillGetData::class, [$this, 'includeRequestsRelationship']);
    }

    /**
     * @param GetModelRelationship $event
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function getModelRelationship(GetModelRelationship $event)
    {
        if ($event->isRelationship(User::class, 'drafts')) {
            return $event->model->hasMany(Draft::class, 'user_id');
        }
    }

    /**
     * @param GetApiRelationship $event
     *
     * @return \Tobscure\JsonApi\Relationship|null
     */
    public function getApiRelationship(GetApiRelationship $event)
    {
        if ($event->isRelationship(UserSerializer::class, 'drafts')) {
            return $event->serializer->hasMany($event->model, DraftSerializer::class, 'drafts');
        }
    }

    /**
     * @param WillGetData $event
     */
    public function includeRequestsRelationship(WillGetData $event)
    {
        if ($event->isController(Controller\ListUsersController::class)
            || $event->isController(Controller\ShowUserController::class)) {
            $event->addInclude('drafts');
        }
    }
}
