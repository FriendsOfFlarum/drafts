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
use FoF\Drafts\Api\Controller;
use Illuminate\Contracts\Events\Dispatcher;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->route('/drafts', 'fof.drafts.view'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    (new Extend\Routes('api'))
        ->get('/drafts', 'fof.drafts.index', Controller\ListDraftsController::class)
        ->post('/drafts', 'fof.drafts.create', Controller\CreateDraftController::class)
        ->patch('/drafts/{id}', 'fof.drafts.update', Controller\UpdateDraftController::class)
        ->delete('/drafts/{id}', 'fof.drafts.delete', Controller\DeleteDraftController::class),

    new Extend\Locales(__DIR__.'/resources/locale'),

    function (Dispatcher $events) {
        $events->listen(Serializing::class, Listeners\AddApiAttributes::class);

        $events->subscribe(Listeners\AddRelationships::class);
    },
];
