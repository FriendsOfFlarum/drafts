<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Console;

use Flarum\Foundation\Paths;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Console\Scheduling\Event;

class PublishSchedule
{
    public function __invoke(Event $event)
    {
        $settings = resolve(SettingsRepositoryInterface::class);

        $event
            ->everyMinute()
            ->withoutOverlapping();

        if ((bool) $settings->get('fof-drafts.schedule_on_one_server')) {
            $event->onOneServer();
        }

        if ((bool) $settings->get('fof-drafts.store_log_output')) {
            $paths = resolve(Paths::class);
            $event->appendOutputTo($paths->storage.(DIRECTORY_SEPARATOR.'logs'.DIRECTORY_SEPARATOR.'drafts-publish.log'));
        }
    }
}
