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

use Flarum\Api\Context;
use Flarum\Api\Resource;
use Flarum\Api\Schema;
use Flarum\Extend;
use Flarum\Gdpr\Extend\UserData;
use Flarum\User\User;
use FoF\Drafts\Console\PublishDrafts;
use FoF\Drafts\Console\PublishSchedule;
use Illuminate\Database\Eloquent\Builder;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->jsDirectory(__DIR__.'/js/dist/forum')
        ->css(__DIR__.'/resources/less/forum.less')
        ->route('/drafts', 'fof.drafts.view'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    new Extend\Locales(__DIR__.'/resources/locale'),

    (new Extend\Model(User::class))
        ->relationship('drafts', function ($model) {
            return $model->hasMany(Draft::class, 'user_id');
        }),

    (new Extend\ModelVisibility(Draft::class))
        ->scope(Access\ScopeDraftVisibility::class),

    (new Extend\Console())
        ->command(PublishDrafts::class)
        ->schedule(PublishDrafts::class, PublishSchedule::class),

    new Extend\ApiResource(Api\Resource\DraftResource::class),

    (new Extend\ApiResource(Resource\UserResource::class))
        ->fields(fn () => [
            Schema\Number::make('draftCount')
                ->visible(fn (User $user, Context $context) => $context->getActor()->id === $user->id)
                ->countRelation('drafts', function (Builder $query, Context $context) {
                    $query->whereVisibleTo($context->getActor());
                }),
        ]),

    (new Extend\ApiResource(Resource\ForumResource::class))
        ->fields(fn () => [
            Schema\Boolean::make('canSaveDrafts')
                ->get(function (object $forum, Context $context) {
                    return $context->getActor()->hasPermissionLike('user.saveDrafts');
                }),
            Schema\Boolean::make('canScheduleDrafts')
                ->get(function (object $forum, Context $context) {
                    return $context->getActor()->hasPermissionLike('user.scheduleDrafts');
                }),
        ]),

    (new Extend\Settings())
        ->default('fof-drafts.enable_scheduled_drafts', true)
        ->serializeToForum('drafts.enableScheduledDrafts', 'fof-drafts.enable_scheduled_drafts', 'boolVal'),

    (new Extend\User())
        ->registerPreference('draftAutosaveEnable', 'boolVal', false)
        ->registerPreference('draftAutosaveInterval', 'intVal', 6),

    (new Extend\Conditional())
        ->whenExtensionEnabled('flarum-gdpr', fn () => [
            (new UserData())
                ->addType(Data\Drafts::class),
        ])
        ->whenExtensionEnabled('fof-default-user-preferences', fn () => [
            (new \FoF\DefaultUserPreferences\Extend\RegisterUserPreferenceDefault())
                ->default('draftAutosaveEnable', false, 'checkbox')
                ->default('draftAutosaveInterval', 6, 'number'),
        ]),
];
