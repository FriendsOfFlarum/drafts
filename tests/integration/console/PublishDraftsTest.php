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
 * Tests for the discussion draft title guard added in issue #118.
 *
 * Seeds three past-due discussion drafts with invalid titles (null, empty, whitespace)
 * plus one future-scheduled draft. No reply drafts are present so the command
 * does not attempt any API calls.
 */
class PublishDraftsTest extends ConsoleTestCase
{
    use RetrievesAuthorizedUsers;

    private const PAST = '2020-01-01 00:00:00';
    private const FUTURE = '2099-01-01 00:00:00';

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('fof-drafts');

        $this->setting('fof-drafts.enable_scheduled_drafts', '1');

        $this->prepareDatabase([
            'users' => [
                $this->normalUser(),
            ],
            'drafts' => [
                // ID 1 — null title (past due)
                $this->discussionDraft(['id' => 1, 'title' => null, 'scheduled_for' => self::PAST]),
                // ID 2 — empty string title (past due)
                $this->discussionDraft(['id' => 2, 'title' => '', 'scheduled_for' => self::PAST]),
                // ID 3 — whitespace-only title (past due)
                $this->discussionDraft(['id' => 3, 'title' => '   ', 'scheduled_for' => self::PAST]),
                // ID 4 — null title, future (must not be processed)
                $this->discussionDraft(['id' => 4, 'title' => null, 'scheduled_for' => self::FUTURE]),
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function discussionDraft(array $overrides = []): array
    {
        return array_merge([
            'user_id'                    => 2,
            'content'                    => 'Test content',
            'title'                      => null,
            'relationships'              => '{}',
            'extra'                      => '{}',
            'scheduled_for'              => self::PAST,
            'updated_at'                 => self::PAST,
            'ip_address'                 => '127.0.0.1',
            'scheduled_validation_error' => '',
        ], $overrides);
    }

    // -------------------------------------------------------------------------
    // Tests
    // -------------------------------------------------------------------------

    #[Test]
    public function command_returns_message_when_scheduled_drafts_disabled(): void
    {
        $this->setting('fof-drafts.enable_scheduled_drafts', '0');

        $output = $this->runCommand(['command' => 'drafts:publish']);

        $this->assertStringContainsString('disabled', $output);
    }

    #[Test]
    public function discussion_draft_with_null_title_is_skipped(): void
    {
        $this->runCommand(['command' => 'drafts:publish']);

        $draft = $this->database()->table('drafts')->where('id', 1)->first();
        $this->assertEquals('fof-drafts.console.no_title_error', $draft->scheduled_validation_error);
        $this->assertNotNull($draft->scheduled_for, 'Skipped draft should not be deleted');
    }

    #[Test]
    public function discussion_draft_with_empty_string_title_is_skipped(): void
    {
        $this->runCommand(['command' => 'drafts:publish']);

        $draft = $this->database()->table('drafts')->where('id', 2)->first();
        $this->assertEquals('fof-drafts.console.no_title_error', $draft->scheduled_validation_error);
    }

    #[Test]
    public function discussion_draft_with_whitespace_only_title_is_skipped(): void
    {
        $this->runCommand(['command' => 'drafts:publish']);

        $draft = $this->database()->table('drafts')->where('id', 3)->first();
        $this->assertEquals('fof-drafts.console.no_title_error', $draft->scheduled_validation_error);
    }

    #[Test]
    public function draft_scheduled_in_future_is_not_processed(): void
    {
        $this->runCommand(['command' => 'drafts:publish']);

        $draft = $this->database()->table('drafts')->where('id', 4)->first();
        $this->assertNotNull($draft, 'Future draft should not be processed');
        $this->assertEmpty($draft->scheduled_validation_error);
    }
}
