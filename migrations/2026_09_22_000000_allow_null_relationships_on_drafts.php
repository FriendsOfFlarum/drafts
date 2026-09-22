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
    // DraftResource declares this nullable but the column never was, so omitting it
    // failed on SQLite, PostgreSQL and strict-mode MySQL.
    'up' => function (Builder $schema) {
        $schema->table('drafts', function (Blueprint $table) {
            $table->string('relationships')->nullable()->change();
        });
    },
    'down' => function (Builder $schema) {
        $schema->table('drafts', function (Blueprint $table) {
            $table->string('relationships')->nullable(false)->change();
        });
    },
];
