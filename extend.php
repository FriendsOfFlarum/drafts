<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) 2019 FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE.md
 * file that was distributed with this source code.
 */

namespace FoF\Drafts;

use Flarum\Api\Serializer\CurrentUserSerializer;
use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Extend;
use Flarum\User\User;
use FoF\Drafts\Api\Controller;

return [
    new \FoF\Console\Extend\EnableConsole(),

    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/resources/less/forum.less')
        ->route('/drafts', 'fof.drafts.view'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    (new Extend\Routes('api'))
        ->get('/drafts', 'fof.drafts.index', Controller\ListDraftsController::class)
        ->post('/drafts', 'fof.drafts.create', Controller\CreateDraftController::class)
        ->patch('/drafts/{id}', 'fof.drafts.update', Controller\UpdateDraftController::class)
        ->delete('/drafts/{id}', 'fof.drafts.delete', Controller\DeleteDraftController::class),

    new Extend\Locales(__DIR__.'/resources/locale'),

    (new Extend\Model(User::class))
        ->relationship('drafts', function ($model) {
            return $model->hasMany(Draft::class, 'user_id');
        }),

    (new Extend\Console())->command(Console\PublishDrafts::class),

    (new Extend\ApiSerializer(CurrentUserSerializer::class))
        ->mutate(function (CurrentUserSerializer $serializer) {
            $attributes['draftCount'] = (int) Draft::where('user_id', $serializer->getActor()->id)->count();

            return $attributes;
        }),

    (new Extend\ApiSerializer(ForumSerializer::class))
        ->mutate(function (ForumSerializer $serializer) {
            $attributes['canSaveDrafts'] = $serializer->getActor()->hasPermissionLike('user.saveDrafts');
            $attributes['canScheduleDrafts'] = $serializer->getActor()->hasPermissionLike('user.scheduleDrafts');

            return $attributes;
        }),

    (new Extend\Settings())
        ->serializeToForum('drafts.enableScheduledDrafts', 'fof-drafts.enable_scheduled_drafts', function ($value) {
            return boolval($value);
        }),

    (new Extend\User())
        ->registerPreference('draftAutosaveEnable', function ($value) {
            return boolval($value);
        }, false)
        ->registerPreference('draftAutosaveInterval', function ($value) {
            return intval($value);
        }, 6),

    (new \FoF\Console\Extend\ScheduleCommand(new Console\PublishSchedule())),
];
