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

use Flarum\Discussion\Event\Saving;
use Flarum\Extend;
use Flarum\Testing\integration\ConsoleTestCase;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;

/**
 * The discussion title guard from issue #118, plus the publish loop's per-draft error
 * isolation and `extra` merge precedence.
 *
 * setUp's drafts never reach the API. Tests that need an API call append their own with
 * ids >= 10: prepareDatabase merges recursively, and nothing boots until runCommand().
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

    #[Test]
    public function rejected_draft_does_not_abort_the_batch(): void
    {
        $this->prepareDatabase([
            'drafts' => [
                // Lower id so it is reached first on an unordered full scan.
                // Relationships are replayed verbatim, so an undeclared one is still a
                // hard API rejection — unlike `extra`, which is now filtered first.
                $this->discussionDraft([
                    'id'            => 10,
                    'title'         => 'Poisoned Draft',
                    'relationships' => json_encode(['bogusRel' => ['data' => []]]),
                ]),
                $this->discussionDraft(['id' => 11, 'title' => 'Healthy Draft']),
            ],
        ]);

        $output = $this->runCommand(['command' => 'drafts:publish']);

        $this->assertStringContainsString('Done.', $output, 'Publish loop must run to completion');

        $poisoned = $this->database()->table('drafts')->where('id', 10)->first();
        $this->assertNotNull($poisoned, 'Rejected draft must be kept, not deleted');
        $this->assertStringContainsString(
            'bogusRel',
            (string) $poisoned->scheduled_validation_error,
            'Rejected draft must carry a readable error'
        );

        $this->assertNull(
            $this->database()->table('drafts')->where('id', 11)->first(),
            'Healthy draft must still publish and be deleted'
        );
        $this->assertNotNull(
            $this->database()->table('discussions')->where('title', 'Healthy Draft')->first(),
            'Healthy draft must produce a discussion'
        );
    }

    #[Test]
    public function validation_failure_is_recorded_as_a_readable_message(): void
    {
        $this->prepareDatabase([
            'drafts' => [
                // Exceeds DiscussionResource's 80-character title limit.
                $this->discussionDraft(['id' => 14, 'title' => str_repeat('a', 100)]),
            ],
        ]);

        $this->runCommand(['command' => 'drafts:publish']);

        $error = (string) $this->database()->table('drafts')->where('id', 14)->first()->scheduled_validation_error;

        $this->assertStringContainsString('/data/attributes/title', $error);
        // UnprocessableEntityException::getMessage() is print_r($errors, true); storing
        // that verbatim is what this guards against.
        $this->assertStringNotContainsString('[detail]', $error);
        $this->assertStringNotContainsString('Array', $error);
    }

    /**
     * Deliberate design choice: only API-layer rejections (ErrorProvider / KnownError /
     * ValidationException) are isolated per draft. An unexpected Throwable is a defect
     * or an infrastructure failure and must abort the run so the cron exit code reports
     * it, rather than being written into a field the draft author sees.
     */
    #[Test]
    public function unexpected_exception_aborts_the_run(): void
    {
        $this->extend(
            (new Extend\Event())->listen(Saving::class, function (): never {
                throw new RuntimeException('boom');
            })
        );

        $this->prepareDatabase([
            'drafts' => [
                $this->discussionDraft(['id' => 20, 'title' => 'Explodes']),
            ],
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('boom');

        $this->runCommand(['command' => 'drafts:publish']);
    }

    #[Test]
    public function draft_title_wins_over_extra(): void
    {
        $this->prepareDatabase([
            'drafts' => [
                $this->discussionDraft([
                    'id'    => 12,
                    'title' => 'Original Title',
                    'extra' => json_encode(['title' => 'Extra Title Override']),
                ]),
            ],
        ]);

        $this->runCommand(['command' => 'drafts:publish']);

        $this->assertNotNull(
            $this->database()->table('discussions')->where('title', 'Original Title')->first(),
            'Draft title must win over extra'
        );
        $this->assertNull(
            $this->database()->table('discussions')->where('title', 'Extra Title Override')->first()
        );
    }

    #[Test]
    public function tags_from_draft_relationships_are_applied(): void
    {
        $this->extension('flarum-tags');

        // flarum-tags' default settings are written by its migration through a raw
        // DatabaseSettingsRepository, which bypasses the already-warm memory cache —
        // so they read back as null here. Set them explicitly.
        $this->setting('flarum-tags.min_primary_tags', '1');
        $this->setting('flarum-tags.max_primary_tags', '1');
        $this->setting('flarum-tags.min_secondary_tags', '0');
        $this->setting('flarum-tags.max_secondary_tags', '3');

        $this->prepareDatabase([
            'drafts' => [
                $this->discussionDraft([
                    'id'            => 13,
                    'title'         => 'Tagged Draft',
                    // Tag 1 ("General") is seeded by the flarum-tags migration.
                    'relationships' => json_encode(['tags' => ['data' => [['type' => 'tags', 'id' => '1']]]]),
                ]),
            ],
        ]);

        $this->runCommand(['command' => 'drafts:publish']);

        $discussion = $this->database()->table('discussions')->where('title', 'Tagged Draft')->first();
        $this->assertNotNull($discussion, 'Tagged draft must publish');

        $this->assertNotNull(
            $this->database()->table('discussion_tag')
                ->where('discussion_id', $discussion->id)
                ->where('tag_id', 1)
                ->first(),
            'Tags replayed from draft relationships must be attached'
        );
    }

    /**
     * `extra` is whatever the composer held when the draft was saved. If the extension
     * that owned a key is later disabled, that key is no longer a declared field on the
     * target resource — forwarding it would make the draft permanently unpublishable
     * and re-fail on every cron tick, so it is dropped instead.
     */
    #[Test]
    public function extra_key_undeclared_by_the_target_resource_is_dropped(): void
    {
        $this->prepareDatabase([
            'drafts' => [
                $this->discussionDraft([
                    'id'    => 15,
                    'title' => 'Survives a disabled extension',
                    'extra' => json_encode(['bogusField' => 'oops', 'content' => 'and a declared one']),
                ]),
            ],
        ]);

        $this->runCommand(['command' => 'drafts:publish']);

        $draft = $this->database()->table('drafts')->where('id', 15)->first();
        $this->assertNull($draft, 'Draft must publish rather than fail on the stale key');

        $discussion = $this->database()->table('discussions')
            ->where('title', 'Survives a disabled extension')
            ->first();
        $this->assertNotNull($discussion);

        // The declared `extra` key still goes through — only undeclared ones are
        // filtered — but the draft's own content wins over it, as before.
        $content = (string) $this->database()->table('posts')->where('id', $discussion->first_post_id)->first()->content;

        $this->assertStringContainsString('Test content', $content);
        $this->assertStringNotContainsString('and a declared one', $content);
    }
}
