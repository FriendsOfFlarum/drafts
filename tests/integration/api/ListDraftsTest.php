<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Tests\integration\api;

use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use PHPUnit\Framework\Attributes\Test;

/**
 * Tests that the drafts index endpoint returns drafts newest-first by
 * default and honors offset-based pagination.
 *
 * Seeds 45 drafts for a dedicated user with ascending updated_at (so
 * natural, unsorted order would return the oldest drafts first — the
 * bug this guards against). A dedicated user is used so that drafts
 * seeded by other test classes sharing the database do not affect the
 * expectations, as the visibility scope restricts listings to the
 * actor's own drafts.
 */
class ListDraftsTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    private const USER_ID = 999;
    private const TOTAL_DRAFTS = 45;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('fof-drafts');

        $user = $this->normalUser();
        $user['id'] = self::USER_ID;
        $user['username'] = 'drafts_lister';
        $user['email'] = 'drafts_lister@machine.local';

        $drafts = [];

        for ($i = 1; $i <= self::TOTAL_DRAFTS; $i++) {
            $drafts[] = [
                'user_id' => self::USER_ID,
                'content' => 'Draft content '.$i,
                'relationships' => '{}',
                'extra' => '{}',
                'ip_address' => '127.0.0.1',
                'scheduled_validation_error' => '',
                'updated_at' => $this->draftUpdatedAt($i),
            ];
        }

        $this->prepareDatabase([
            'users' => [
                $user,
            ],
            'group_permission' => [
                ['group_id' => 3, 'permission' => 'user.saveDrafts'],
            ],
            'drafts' => $drafts,
        ]);
    }

    private function draftUpdatedAt(int $i): string
    {
        return date('Y-m-d H:i:s', strtotime('2026-01-01 00:00:00 +'.$i.' minutes'));
    }

    /**
     * The seeded drafts' ids, newest first, as the API is expected to
     * order them.
     */
    private function draftIdsNewestFirst(): array
    {
        return $this->database()->table('drafts')
            ->where('user_id', self::USER_ID)
            ->orderBy('updated_at', 'desc')
            ->pluck('id')
            ->all();
    }

    #[Test]
    public function lists_drafts_newest_first_with_pagination_meta(): void
    {
        $response = $this->send(
            $this->request('GET', '/api/drafts', ['authenticatedAs' => self::USER_ID])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $body = json_decode((string) $response->getBody(), true);
        $expected = $this->draftIdsNewestFirst();

        // Default page size
        $this->assertCount(20, $body['data']);

        // Newest first: the first page spans the 20 most recently
        // updated drafts.
        $this->assertEquals($expected[0], $body['data'][0]['id']);
        $this->assertEquals($expected[19], $body['data'][19]['id']);

        $this->assertEquals(self::TOTAL_DRAFTS, $body['meta']['page']['total']);
        $this->assertEquals(20, $body['meta']['page']['limit']);
        $this->assertArrayHasKey('next', $body['links']);
    }

    #[Test]
    public function offset_pagination_returns_the_next_page(): void
    {
        $request = $this->request('GET', '/api/drafts', ['authenticatedAs' => self::USER_ID])
            ->withQueryParams(['page' => ['offset' => 20]]);

        $response = $this->send($request);

        $this->assertEquals(200, $response->getStatusCode());

        $body = json_decode((string) $response->getBody(), true);
        $expected = $this->draftIdsNewestFirst();

        $this->assertCount(20, $body['data']);
        $this->assertEquals($expected[20], $body['data'][0]['id']);
        $this->assertEquals($expected[39], $body['data'][19]['id']);
        $this->assertArrayHasKey('next', $body['links']);
    }

    #[Test]
    public function last_page_has_no_next_link(): void
    {
        $request = $this->request('GET', '/api/drafts', ['authenticatedAs' => self::USER_ID])
            ->withQueryParams(['page' => ['offset' => 40]]);

        $response = $this->send($request);

        $this->assertEquals(200, $response->getStatusCode());

        $body = json_decode((string) $response->getBody(), true);
        $expected = $this->draftIdsNewestFirst();

        $this->assertCount(self::TOTAL_DRAFTS - 40, $body['data']);

        foreach ([0, 1, 2, 3, 4] as $index) {
            $this->assertEquals($expected[40 + $index], $body['data'][$index]['id']);
        }

        $this->assertArrayNotHasKey('next', $body['links'] ?? []);
    }
}
