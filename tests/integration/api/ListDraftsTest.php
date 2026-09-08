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

use Flarum\Testing\integration\TestCase;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use PHPUnit\Framework\Attributes\Test;

/**
 * Tests that the drafts index endpoint returns drafts newest-first by
 * default and honors offset-based pagination.
 *
 * Seeds 45 drafts for one user with ascending updated_at (so natural,
 * unsorted order would return the oldest drafts first — the bug this
 * guards against).
 */
class ListDraftsTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    private const TOTAL_DRAFTS = 45;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('fof-drafts');

        $drafts = [];

        for ($i = 1; $i <= self::TOTAL_DRAFTS; $i++) {
            $drafts[] = [
                'user_id' => 2,
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
                $this->normalUser(),
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

    #[Test]
    public function lists_drafts_newest_first_with_pagination_meta(): void
    {
        $response = $this->send(
            $this->request('GET', '/api/drafts', ['authenticatedAs' => 2])
        );

        $this->assertEquals(200, $response->getStatusCode());

        $body = json_decode((string) $response->getBody(), true);

        // Default page size
        $this->assertCount(20, $body['data']);

        // Newest first: the most recently updated draft (id 45) comes first,
        // the oldest of the first page (id 26) comes last.
        $this->assertEquals('45', $body['data'][0]['id']);
        $this->assertEquals('26', $body['data'][19]['id']);

        $this->assertEquals(self::TOTAL_DRAFTS, $body['meta']['page']['total']);
        $this->assertEquals(20, $body['meta']['page']['limit']);
        $this->assertArrayHasKey('next', $body['links']);
    }

    #[Test]
    public function offset_pagination_returns_the_next_page(): void
    {
        $request = $this->request('GET', '/api/drafts', ['authenticatedAs' => 2])
            ->withQueryParams(['page' => ['offset' => 20]]);

        $response = $this->send($request);

        $this->assertEquals(200, $response->getStatusCode());

        $body = json_decode((string) $response->getBody(), true);

        $this->assertCount(20, $body['data']);
        $this->assertEquals('25', $body['data'][0]['id']);
        $this->assertEquals('6', $body['data'][19]['id']);
        $this->assertArrayHasKey('next', $body['links']);
    }

    #[Test]
    public function last_page_has_no_next_link(): void
    {
        $request = $this->request('GET', '/api/drafts', ['authenticatedAs' => 2])
            ->withQueryParams(['page' => ['offset' => 40]]);

        $response = $this->send($request);

        $this->assertEquals(200, $response->getStatusCode());

        $body = json_decode((string) $response->getBody(), true);

        $this->assertCount(5, $body['data']);
        $this->assertEquals('5', $body['data'][0]['id']);
        $this->assertEquals('1', $body['data'][4]['id']);
        $this->assertArrayNotHasKey('next', $body['links'] ?? []);
    }
}
