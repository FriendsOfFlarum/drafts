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
use Flarum\Discussion\Discussion;
use Flarum\Discussion\Event\Saving as DiscussionSaving;
use Flarum\Discussion\Event\Started;
use Flarum\Extend;
use Flarum\Post\Event\Saving as PostSaving;
use Flarum\Post\Post;
use Flarum\Testing\integration\ConsoleTestCase;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use FoF\Drafts\Draft;

class PublishDraftsTest extends ConsoleTestCase
{
    use RetrievesAuthorizedUsers;

    const EXTRA = '{"isSticky":true,"myExtensionField":"kept"}';

    /** Any past timestamp — the command picks up every draft due on or before now. */
    const SCHEDULED_FOR = '2026-01-02 09:00:00';

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('fof-drafts');

        RecordsSavedAttributes::$attributes = [];

        $this->prepareDatabase([
            'users' => [
                $this->normalUser(),
            ],
            'discussions' => [
                ['id' => 1, 'title' => 'Existing discussion', 'user_id' => 1, 'first_post_id' => 1, 'last_post_id' => 1, 'last_posted_user_id' => 1, 'comment_count' => 1, 'created_at' => Carbon::parse('2026-01-01 00:00:00'), 'last_posted_at' => Carbon::parse('2026-01-01 00:00:00')],
            ],
            'posts' => [
                ['id' => 1, 'discussion_id' => 1, 'user_id' => 1, 'type' => 'comment', 'number' => 1, 'content' => '<t><p>Root post</p></t>', 'created_at' => Carbon::parse('2026-01-01 00:00:00')],
            ],
        ]);
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

    /**
     * @test
     */
    public function reply_draft_publishes_extra_attributes_alongside_the_content()
    {
        $this->draft(['relationships' => $this->replyTo(1), 'extra' => self::EXTRA]);

        $this->publish();

        $this->assertSame('kept', $this->capturedAttribute('myExtensionField'));
        $this->assertTrue($this->capturedAttribute('isSticky'));
        $this->assertNotNull(Post::query()->where('discussion_id', 1)->where('number', 2)->first());
    }

    /**
     * @test
     */
    public function discussion_draft_publishes_extra_attributes_alongside_title_and_content()
    {
        $this->draft(['title' => 'Scheduled title', 'relationships' => '[]', 'extra' => self::EXTRA]);

        $this->publish();

        $this->assertSame('kept', $this->capturedAttribute('myExtensionField'));
        $this->assertSame('Scheduled title', $this->capturedAttribute('title'));
        $this->assertNotNull(Discussion::query()->where('title', 'Scheduled title')->first());
    }

    /**
     * @test
     */
    public function draft_columns_override_a_conflicting_extra_attribute()
    {
        // array_merge order is load-bearing: a stale composer value must not beat the columns.
        $this->draft([
            'title'         => 'Column title',
            'content'       => 'Column content',
            'relationships' => '[]',
            'extra'         => '{"title":"Extra title","content":"Extra content"}',
        ]);

        $this->publish();

        $this->assertSame('Column title', $this->capturedAttribute('title'));
        $this->assertSame('Column content', $this->capturedAttribute('content'));
    }

    /**
     * @test
     */
    public function draft_without_extra_is_still_published()
    {
        $this->draft(['relationships' => $this->replyTo(1), 'extra' => null]);

        $this->publish();

        $this->assertSame(0, Draft::query()->count());
        $this->assertNotNull(Post::query()->where('discussion_id', 1)->where('number', 2)->first());
    }

    /**
     * @test
     */
    public function draft_with_unreadable_extra_is_still_published()
    {
        $this->draft(['relationships' => $this->replyTo(1), 'extra' => 'not json']);

        $this->publish();

        $this->assertSame(0, Draft::query()->count());
        $this->assertNotNull(Post::query()->where('discussion_id', 1)->where('number', 2)->first());
    }

    /**
     * @test
     */
    public function published_reply_is_backdated_to_the_scheduled_time()
    {
        $this->draft(['relationships' => $this->replyTo(1)]);

        $this->publish();

        $post = Post::query()->where('discussion_id', 1)->where('number', 2)->first();

        $this->assertSame(self::SCHEDULED_FOR, $post->created_at->format('Y-m-d H:i:s'));
    }

    /**
     * @test
     */
    public function discussion_draft_is_deleted_when_no_first_post_remains()
    {
        $this->extend(
            (new Extend\Event())->listen(Started::class, DetachesFirstPost::class)
        );

        $this->draft(['title' => 'Orphaned', 'relationships' => '[]']);

        $this->publish();

        $this->assertSame(0, Draft::query()->count());
        $this->assertNotNull(Discussion::query()->where('title', 'Orphaned')->first());
    }

    private function publish(): string
    {
        $this->extend(
            (new Extend\Event())
                ->listen(DiscussionSaving::class, RecordsSavedAttributes::class)
                ->listen(PostSaving::class, RecordsSavedAttributes::class)
        );

        return $this->runCommand(['command' => 'drafts:publish']);
    }

    private function draft(array $overrides = []): void
    {
        $this->prepareDatabase([
            'drafts' => [
                array_merge([
                    'id'            => 1,
                    'user_id'       => 2,
                    'title'         => null,
                    'content'       => 'Scheduled content',
                    'relationships' => '[]',
                    'extra'         => null,
                    'scheduled_for' => self::SCHEDULED_FOR,
                    'updated_at'    => self::SCHEDULED_FOR,
                    'ip_address'    => '127.0.0.1',
                ], $overrides),
            ],
        ]);
    }

    private function replyTo(int $discussionId): string
    {
        return json_encode(['discussion' => ['data' => ['id' => (string) $discussionId]]]);
    }

    /**
     * @return mixed
     */
    private function capturedAttribute(string $key)
    {
        foreach (RecordsSavedAttributes::$attributes as $attributes) {
            if (array_key_exists($key, $attributes)) {
                return $attributes[$key];
            }
        }

        return null;
    }
}
