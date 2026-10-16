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
 * A draft that has data must not be updatable into a completely empty one.
 */
class UpdateDraftTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    private const USER_ID = 996;
    private const DRAFT_ID = 9960;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('fof-drafts');

        $user = $this->normalUser();
        $user['id'] = self::USER_ID;
        $user['username'] = 'drafts_updater';
        $user['email'] = 'drafts_updater@machine.local';

        $this->prepareDatabase([
            'users' => [
                $user,
            ],
            'group_permission' => [
                ['group_id' => 3, 'permission' => 'user.saveDrafts'],
            ],
            'drafts' => [
                [
                    'id'                         => self::DRAFT_ID,
                    'user_id'                    => self::USER_ID,
                    'title'                      => null,
                    'content'                    => 'Something worth keeping',
                    'relationships'              => '{}',
                    'extra'                      => null,
                    'ip_address'                 => '127.0.0.1',
                    'scheduled_validation_error' => '',
                    'updated_at'                 => '2026-01-01 00:00:00',
                ],
            ],
        ]);
    }

    #[Test]
    public function cannot_update_a_draft_until_it_is_empty(): void
    {
        $response = $this->send(
            $this->request('PATCH', '/api/drafts/'.self::DRAFT_ID, [
                'authenticatedAs' => self::USER_ID,
                'json'            => [
                    'data' => [
                        'type'       => 'drafts',
                        'id'         => (string) self::DRAFT_ID,
                        'attributes' => [
                            'content' => '',
                            'title'   => '',
                            'extra'   => [],
                        ],
                    ],
                ],
            ])
        );

        $this->assertEquals(422, $response->getStatusCode(), (string) $response->getBody());

        $body = json_decode((string) $response->getBody(), true);

        $this->assertSame('/data/attributes/content', $body['errors'][0]['source']['pointer']);

        // The draft is untouched: read it back through the index endpoint.
        $list = $this->send(
            $this->request('GET', '/api/drafts', ['authenticatedAs' => self::USER_ID])
        );

        $this->assertEquals(200, $list->getStatusCode());

        $listBody = json_decode((string) $list->getBody(), true);

        $this->assertCount(1, $listBody['data']);
        $this->assertSame((string) self::DRAFT_ID, $listBody['data'][0]['id']);
        $this->assertSame('Something worth keeping', $listBody['data'][0]['attributes']['content']);
    }
}
