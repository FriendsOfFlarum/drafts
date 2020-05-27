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

use Flarum\Api\Event\Serializing;
use Flarum\Extend;
use Flarum\Foundation\Application;
use Flarum\User\User;
use FoF\Drafts\Api\Controller;
use Illuminate\Contracts\Events\Dispatcher;

return [
    new \FoF\Components\Extend\AddFofComponents(),
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

    function (Application $app, Dispatcher $events) {
        $events->listen(Serializing::class, Listeners\AddApiAttributes::class);

        $events->subscribe(Listeners\AddSettings::class);

        $app->register(Providers\ConsoleProvider::class);

        User::addPreference('draftAutosaveEnable', function ($value) {
            return boolval($value);
        }, true);
        User::addPreference('draftAutosaveInterval', function ($value) {
            return intval($value);
        }, 6);
    },
];
