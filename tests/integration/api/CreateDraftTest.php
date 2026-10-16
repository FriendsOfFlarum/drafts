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
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;

/**
 * A new-discussion draft with a title and a tag but no body content must be
 * accepted: the composer sends `content: ""` for an empty editor.
 */
class CreateDraftTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    private const USER_ID = 997;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('fof-drafts');

        $user = $this->normalUser();
        $user['id'] = self::USER_ID;
        $user['username'] = 'drafts_creator';
        $user['email'] = 'drafts_creator@machine.local';

        $this->prepareDatabase([
            'users' => [
                $user,
            ],
            'group_permission' => [
                ['group_id' => 3, 'permission' => 'user.saveDrafts'],
            ],
        ]);
    }

    public static function contentlessAttributes(): array
    {
        return [
            'empty string content' => [['content' => '']],
            'content omitted'      => [[]],
        ];
    }

    #[Test]
    #[DataProvider('contentlessAttributes')]
    public function can_create_discussion_draft_with_title_and_tag_but_no_content(array $contentAttributes): void
    {
        $response = $this->send(
            $this->request('POST', '/api/drafts', [
                'authenticatedAs' => self::USER_ID,
                'json'            => [
                    'data' => [
                        'type'       => 'drafts',
                        'attributes' => $contentAttributes + [
                            'title'         => 'A title without a body',
                            'relationships' => ['tags' => ['data' => [['type' => 'tags', 'id' => '1']]]],
                            'extra'         => [],
                        ],
                    ],
                ],
            ])
        );

        $this->assertEquals(201, $response->getStatusCode(), (string) $response->getBody());

        $body = json_decode((string) $response->getBody(), true);

        $this->assertSame('A title without a body', $body['data']['attributes']['title']);
    }

    #[Test]
    public function can_create_a_draft_whose_only_data_is_extra(): void
    {
        $extra = ['some-extension' => ['answer' => 42]];

        $response = $this->send(
            $this->request('POST', '/api/drafts', [
                'authenticatedAs' => self::USER_ID,
                'json'            => [
                    'data' => [
                        'type'       => 'drafts',
                        'attributes' => [
                            'content'       => '',
                            'extra'         => ['some-extension' => ['answer' => 42]],
                            'relationships' => ['discussion' => ['data' => ['type' => 'discussions', 'id' => '1']]],
                        ],
                    ],
                ],
            ])
        );

        $this->assertEquals(201, $response->getStatusCode(), (string) $response->getBody());

        $body = json_decode((string) $response->getBody(), true);

        $this->assertSame($extra, $body['data']['attributes']['extra']);
    }

    public static function completelyEmptyAttributes(): array
    {
        return [
            'only relationships (reply-style)' => [[
                'relationships' => ['discussion' => ['data' => ['type' => 'discussions', 'id' => '1']]],
            ]],
            'empty title, content and extra' => [[
                'title'   => '',
                'content' => '',
                'extra'   => [],
            ]],
            'whitespace only title and content' => [[
                'title'   => '   ',
                'content' => "\n\t ",
            ]],
            'null title, content and extra' => [[
                'title'   => null,
                'content' => null,
                'extra'   => null,
            ]],
        ];
    }

    #[Test]
    #[DataProvider('completelyEmptyAttributes')]
    public function cannot_create_a_completely_empty_draft(array $attributes): void
    {
        $response = $this->send(
            $this->request('POST', '/api/drafts', [
                'authenticatedAs' => self::USER_ID,
                'json'            => [
                    'data' => [
                        'type'       => 'drafts',
                        'attributes' => $attributes,
                    ],
                ],
            ])
        );

        $this->assertEquals(422, $response->getStatusCode(), (string) $response->getBody());

        $body = json_decode((string) $response->getBody(), true);

        $this->assertSame('/data/attributes/content', $body['errors'][0]['source']['pointer']);
    }
}
