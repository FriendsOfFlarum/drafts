<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace FoF\Drafts;

use Blomstra\Gdpr\Extend\UserData;
use Flarum\Api\Serializer\CurrentUserSerializer;
use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Extend;
use Flarum\User\User;
use FoF\Drafts\Api\Controller;
use FoF\Drafts\Console\PublishDrafts;
use FoF\Drafts\Console\PublishSchedule;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/resources/less/forum.less')
        ->route('/drafts', 'fof.drafts.view'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    (new Extend\Routes('api'))
        ->get('/drafts', 'fof.drafts.index', Controller\ListDraftsController::class)
        ->post('/drafts', 'fof.drafts.create', Controller\CreateDraftController::class)
        ->delete('/drafts/all', 'fof.drafts.delete.all', Controller\DeleteMyDraftsController::class)
        ->patch('/drafts/{id}', 'fof.drafts.update', Controller\UpdateDraftController::class)
        ->delete('/drafts/{id}', 'fof.drafts.delete', Controller\DeleteDraftController::class),

    new Extend\Locales(__DIR__.'/resources/locale'),

    (new Extend\Model(User::class))
        ->relationship('drafts', function ($model) {
            return $model->hasMany(Draft::class, 'user_id');
        }),

    (new Extend\Console())
        ->command(PublishDrafts::class)
        ->schedule(PublishDrafts::class, PublishSchedule::class),

    (new Extend\ApiSerializer(CurrentUserSerializer::class))
        ->attributes(function (CurrentUserSerializer $serializer) {
            $attributes['draftCount'] = (int) Draft::where('user_id', $serializer->getActor()->id)->count();

            return $attributes;
        }),

    (new Extend\ApiSerializer(ForumSerializer::class))
        ->attributes(function (ForumSerializer $serializer) {
            $attributes['canSaveDrafts'] = $serializer->getActor()->hasPermissionLike('user.saveDrafts');
            $attributes['canScheduleDrafts'] = $serializer->getActor()->hasPermissionLike('user.scheduleDrafts');

            return $attributes;
        }),

    (new Extend\Settings())
        ->default('fof-drafts.enable_scheduled_drafts', true)
        ->serializeToForum('drafts.enableScheduledDrafts', 'fof-drafts.enable_scheduled_drafts', 'boolVal'),

    (new Extend\User())
        ->registerPreference('draftAutosaveEnable', 'boolVal', false)
        ->registerPreference('draftAutosaveInterval', 'intVal', 6),

    (new Extend\Conditional())
        ->whenExtensionEnabled('blomstra-gdpr', fn () => [
            (new UserData())
                ->addType(Data\Drafts::class),
        ]),
];
