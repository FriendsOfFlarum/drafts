<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Tests\integration\console;

use Flarum\Discussion\Event\Started;

/**
 * Reproduces the state the null-guard exists for. Detaching in memory as well as
 * in the database matters: the command saves the discussion once more before
 * reloading, which would otherwise write the stale id back.
 */
class DetachesFirstPost
{
    public function handle(Started $event): void
    {
        $discussion = $event->discussion;

        if ($discussion->firstPost) {
            $discussion->firstPost->delete();
        }

        $discussion->first_post_id = null;
        $discussion->setRelation('firstPost', null);
    }
}
