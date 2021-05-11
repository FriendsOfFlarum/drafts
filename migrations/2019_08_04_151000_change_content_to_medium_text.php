<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up'   => function (Builder $schema) {
        $schema->table('drafts', function (Blueprint $table) {
            $table->mediumText('content')->change();
        });
    },
    'down'   => function (Builder $schema) {
        $schema->table('drafts', function (Blueprint $table) {
            $table->string('content')->change();
        });
    },
];
