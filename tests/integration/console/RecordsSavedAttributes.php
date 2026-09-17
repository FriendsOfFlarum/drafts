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

/**
 * Stands in for a third-party extension reading composer attributes off the
 * Saving events — core consumes only title and content, so the merge has no
 * other observable effect.
 *
 * Must stay a class, not a closure: under processIsolation a closure reachable
 * from the test case masks real failures with "Serialization of 'Closure' is
 * not allowed".
 */
class RecordsSavedAttributes
{
    /** @var array<int, array> */
    public static $attributes = [];

    public function handle($event): void
    {
        self::$attributes[] = $event->data['attributes'] ?? [];
    }
}
