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
 * Reply drafts bypass the discussion title guard from issue #118 — they carry a
 * discussion relationship and need no title — and the reply branch merges `extra`
 * with the same precedence as the discussion branch.
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
                $this->replyDraft(['id' => 1]),
            ],
        ]);
    }

    private function replyDraft(array $overrides = []): array
    {
        return array_merge([
            'user_id'                    => 2,
            'content'                    => 'Test reply content',
            'title'                      => null,
            'relationships'              => json_encode(['discussion' => ['data' => ['id' => '1']]]),
            'extra'                      => '{}',
            'scheduled_for'              => self::PAST,
            'updated_at'                 => self::PAST,
            'ip_address'                 => '127.0.0.1',
            'scheduled_validation_error' => '',
        ], $overrides);
    }

    #[Test]
    public function reply_draft_with_no_title_is_not_skipped_by_title_guard(): void
    {
        $this->runCommand(['command' => 'drafts:publish']);

        $this->assertNull(
            $this->database()->table('drafts')->where('id', 1)->first(),
            'Reply draft should be deleted after publishing'
        );
    }

    /**
     * Same filtering as the discussion branch: a key PostResource does not declare is
     * dropped so the draft still publishes.
     */
    #[Test]
    public function reply_draft_drops_extra_keys_undeclared_by_post_resource(): void
    {
        $this->prepareDatabase([
            'drafts' => [
                $this->replyDraft(['id' => 10, 'extra' => json_encode(['bogusField' => 'oops'])]),
            ],
        ]);

        $output = $this->runCommand(['command' => 'drafts:publish']);

        $this->assertStringContainsString('Done.', $output);

        $this->assertNull(
            $this->database()->table('drafts')->where('id', 10)->first(),
            'Reply draft must publish rather than fail on the stale key'
        );
    }

    #[Test]
    public function reply_draft_content_wins_over_extra(): void
    {
        $this->prepareDatabase([
            'drafts' => [
                $this->replyDraft([
                    'id'      => 11,
                    'content' => 'Draft reply content wins',
                    'extra'   => json_encode(['content' => 'Extra content override']),
                ]),
            ],
        ]);

        $this->runCommand(['command' => 'drafts:publish']);

        $this->assertNull(
            $this->database()->table('drafts')->where('id', 11)->first(),
            'Reply draft should publish'
        );

        $contents = $this->database()->table('posts')->pluck('content')->implode("\n");
        $this->assertStringContainsString('Draft reply content wins', $contents);
        $this->assertStringNotContainsString('Extra content override', $contents);
    }
}
