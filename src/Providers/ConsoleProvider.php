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
use Flarum\Settings\SettingsRepositoryInterface;
use FoF\Drafts\Console\PublishDrafts;
use Illuminate\Console\Scheduling\Schedule;

class ConsoleProvider extends AbstractServiceProvider
{
    public function register()
    {
        if (!defined('ARTISAN_BINARY')) {
            define('ARTISAN_BINARY', 'flarum');
        }

        $this->app->resolving(Schedule::class, function (Schedule $schedule) {
            $settings = $this->app->make(SettingsRepositoryInterface::class);

            $build = $schedule->command(PublishDrafts::class)
                ->everyMinute()
                ->withoutOverlapping();

            if ((bool) $settings->get('fof-drafts.schedule_on_one_server')) {
                $build->onOneServer();
            }

            if ((bool) $settings->get('fof-best-answer.store_log_output')) {
                $build->appendOutputTo(storage_path('logs'.DIRECTORY_SEPARATOR.'drafts-publish.log'));
            }
        });
    }
}
