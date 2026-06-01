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

use Flarum\Testing\integration\ConsoleTestCase;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use PHPUnit\Framework\Attributes\Test;

/**
 * Tests that reply drafts bypass the discussion title guard from issue #118.
 *
 * A reply draft has a discussion relationship and does not need a title.
 * The command should publish the reply and delete the draft.
 */
class PublishDraftsReplyTest extends ConsoleTestCase
{
    use RetrievesAuthorizedUsers;

    private const PAST = '2020-01-01 00:00:00';

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('fof-drafts');

        $this->setting('fof-drafts.enable_scheduled_drafts', '1');

        $this->prepareDatabase([
            'users' => [
                $this->normalUser(),
            ],
            'discussions' => [
                [
                    'id'         => 1,
                    'title'      => 'Test Discussion',
                    'user_id'    => 2,
                    'created_at' => self::PAST,
                    'slug'       => 'test-discussion',
                    'is_private' => 0,
                ],
            ],
            'drafts' => [
                [
                    'id'                         => 1,
                    'user_id'                    => 2,
                    'content'                    => 'Test reply content',
                    'title'                      => null,
                    'relationships'              => json_encode(['discussion' => ['data' => ['id' => '1']]]),
                    'extra'                      => '{}',
                    'scheduled_for'              => self::PAST,
                    'updated_at'                 => self::PAST,
                    'ip_address'                 => '127.0.0.1',
                    'scheduled_validation_error' => '',
                ],
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Tests
    // -------------------------------------------------------------------------

    #[Test]
    public function reply_draft_with_no_title_is_not_skipped_by_title_guard(): void
    {
        $this->runCommand(['command' => 'drafts:publish']);

        $this->assertNull(
            $this->database()->table('drafts')->where('id', 1)->first(),
            'Reply draft should be deleted after publishing'
        );
    }
}
