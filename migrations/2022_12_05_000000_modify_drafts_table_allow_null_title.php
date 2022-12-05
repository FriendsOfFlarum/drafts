<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up'   => function (Builder $schema) {
        $schema->table('drafts', function (Blueprint $table) {
            $table->string('title')->nullable()->change();
            $table->mediumText('content')->nullable()->change();
        });
    },
    'down'   => function (Builder $schema) {
        $schema->table('drafts', function (Blueprint $table) {
            $table->string('title')->change();
            $table->mediumText('content')->change();
        });
    },
];
