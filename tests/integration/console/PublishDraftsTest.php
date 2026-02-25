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

use Carbon\Carbon;
use Flarum\Testing\integration\ConsoleTestCase;

class PublishDraftsTest extends ConsoleTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('fof-drafts');
    }

    /**
     * @test
     */
    public function it_publishes_scheduled_new_discussion_drafts_without_a_discussion_relationship_id()
    {
        $now = Carbon::create(2026, 1, 1, 12, 0, 0);
        Carbon::setTestNow($now);

        $this->database()->table('settings')->updateOrInsert(
            ['key' => 'fof-drafts.enable_scheduled_drafts'],
            ['value' => '1']
        );

        $initialDiscussionCount = $this->database()->table('discussions')->count();
        $initialPostCount = $this->database()->table('posts')->count();
        $userId = $this->database()->table('users')->min('id');

        $this->database()->table('drafts')->insert([
            'user_id'       => $userId,
            'title'         => 'Scheduled discussion from draft',
            'content'       => 'This is scheduled draft content',
            'relationships' => json_encode([]),
            'updated_at'    => $now->copy()->subMinute()->toDateTimeString(),
            'scheduled_for' => $now->copy()->subMinute()->toDateTimeString(),
            'ip_address'    => '127.0.0.1',
        ]);

        $this->assertEquals(1, $this->database()->table('drafts')->count(), 'Expected seeded draft to exist before running command');

        $output = $this->runCommand([
            'command' => 'drafts:publish',
        ]);
        $this->assertStringContainsString('Published draft discussion:', $output, $output);

        $this->assertEquals(0, $this->database()->table('drafts')->count());
        $this->assertEquals($initialDiscussionCount + 1, $this->database()->table('discussions')->count());
        $this->assertEquals($initialPostCount + 1, $this->database()->table('posts')->count());
        $this->assertEquals(1, $this->database()->table('discussions')->where('title', 'Scheduled discussion from draft')->count());

        Carbon::setTestNow();
    }
}
