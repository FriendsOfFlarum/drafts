<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) 2019 FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE.md
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Providers;

use Flarum\Foundation\AbstractServiceProvider;
use Illuminate\Console\Scheduling\Schedule;

class ConsoleProvider extends AbstractServiceProvider
{
    public function register()
    {
        if (!defined('ARTISAN_BINARY')) {
            define('ARTISAN_BINARY', 'flarum');
        }

        $this->app->resolving(Schedule::class, function (Schedule $schedule) {
            $schedule->command('drafts:publish')
                ->everyMinute()
                ->withoutOverlapping()
                ->appendOutputTo(storage_path('logs/drafts-publish.log'));
        });
    }
}
