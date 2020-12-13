<?php

namespace FoF\Drafts\Console;

use Flarum\Foundation\Paths;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Console\Scheduling\Schedule;

class PublishSchedule
{
    public function __invoke()
    {
        $schedule = app(Schedule::class);
        $settings = app(SettingsRepositoryInterface::class);

        $build = $schedule->command(PublishDrafts::class)
            ->everyMinute()
            ->withoutOverlapping();

        if ((bool) $settings->get('fof-drafts.schedule_on_one_server')) {
            $build->onOneServer();
        }

        if ((bool) $settings->get('fof-drafts.store_log_output')) {
            $paths = app(Paths::class);
            $build->appendOutputTo($paths->storage.(DIRECTORY_SEPARATOR.'logs'.DIRECTORY_SEPARATOR.'drafts-publish.log'));
        }

        return $schedule;
    }
}