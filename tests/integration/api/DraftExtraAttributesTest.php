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

use Flarum\Api\Schema;
use Flarum\Extend;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use FoF\Drafts\Api\Resource\DraftResource;
use FoF\Drafts\Draft;
use PHPUnit\Framework\Attributes\Test;

/**
 * The create/update before() hook that keeps undeclared composer attributes in `extra`,
 * which 2.x would otherwise reject outright.
 */
class DraftExtraAttributesTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('fof-drafts');

        $this->prepareDatabase([
            'users' => [
                $this->normalUser(),
            ],
        ]);
    }

    private function createDraft(array $attributes): array
    {
        $response = $this->send(
            $this->request('POST', '/api/drafts', [
                'authenticatedAs' => 1,
                'json'            => [
                    'data' => [
                        'type'       => 'drafts',
                        'attributes' => $attributes,
                    ],
                ],
            ])
        );

        $this->assertEquals(201, $response->getStatusCode(), (string) $response->getBody());

        return json_decode((string) $response->getBody(), true);
    }

    private function patchDraft(string $id, array $attributes): array
    {
        $response = $this->send(
            $this->request('PATCH', '/api/drafts/'.$id, [
                'authenticatedAs' => 1,
                'json'            => [
                    'data' => [
                        'type'       => 'drafts',
                        'id'         => $id,
                        'attributes' => $attributes,
                    ],
                ],
            ])
        );

        $this->assertEquals(200, $response->getStatusCode(), (string) $response->getBody());

        return json_decode((string) $response->getBody(), true);
    }

    private function storedExtra(string $id): ?array
    {
        return json_decode((string) $this->database()->table('drafts')->where('id', $id)->first()->extra, true);
    }

    #[Test]
    public function undeclared_attribute_on_create_is_folded_into_extra(): void
    {
        $body = $this->createDraft([
            'title'   => 'Draft with a poll',
            'content' => 'Body',
            'poll'    => ['question' => 'Best colour?'],
        ]);

        $attributes = $body['data']['attributes'];

        $this->assertArrayNotHasKey('poll', $attributes, 'Undeclared keys must not survive at the top level');
        // Flat: compileData() merges extra() into `fields`, so extra.poll must become
        // app.composer.fields.poll and nothing deeper.
        $this->assertSame(['poll' => ['question' => 'Best colour?']], $attributes['extra']);
        $this->assertSame(['poll' => ['question' => 'Best colour?']], $this->storedExtra($body['data']['id']));
    }

    #[Test]
    public function undeclared_attribute_on_update_merges_into_stored_extra(): void
    {
        $id = $this->createDraft([
            'title'   => 'Draft',
            'content' => 'Body',
            'poll'    => ['question' => 'Best colour?'],
        ])['data']['id'];

        // Schema\Arr sets wholesale, so without the merge this PATCH would drop `poll`.
        $body = $this->patchDraft($id, [
            'content' => 'Body edited',
            'survey'  => 'kept too',
        ]);

        $this->assertSame(
            ['poll' => ['question' => 'Best colour?'], 'survey' => 'kept too'],
            $body['data']['attributes']['extra']
        );
        $this->assertSame(
            ['poll' => ['question' => 'Best colour?'], 'survey' => 'kept too'],
            $this->storedExtra($id)
        );
    }

    #[Test]
    public function undeclared_sibling_wins_over_an_explicit_extra_in_the_same_payload(): void
    {
        $body = $this->createDraft([
            'content' => 'Body',
            'extra'   => ['poll' => 'stale echo', 'untouched' => 'kept'],
            'poll'    => 'live composer value',
        ]);

        $this->assertSame(
            ['poll' => 'live composer value', 'untouched' => 'kept'],
            $body['data']['attributes']['extra']
        );
    }

    /**
     * The escape hatch: with no undeclared siblings, `extra` keeps its wholesale set
     * semantics and stays the only way to drop a stored key.
     */
    #[Test]
    public function an_explicit_extra_alone_still_replaces_the_stored_one(): void
    {
        $id = $this->createDraft([
            'content' => 'Body',
            'poll'    => ['question' => 'Best colour?'],
        ])['data']['id'];

        $body = $this->patchDraft($id, ['extra' => ['survey' => 'only this']]);

        $this->assertSame(['survey' => 'only this'], $body['data']['attributes']['extra']);
        $this->assertSame(['survey' => 'only this'], $this->storedExtra($id));
    }

    /**
     * A field another extension contributes is declared too, and must not be swept in.
     */
    #[Test]
    public function a_field_added_by_another_extension_is_not_treated_as_undeclared(): void
    {
        $this->extend(
            (new Extend\ApiResource(DraftResource::class))
                ->fields(fn () => [
                    Schema\Str::make('addedByAnotherExtension')
                        ->writable()
                        ->get(fn () => 'resolved elsewhere')
                        ->set(function (): void {
                        }),
                ])
        );

        $body = $this->createDraft([
            'title'                   => 'Body',
            'content'                 => 'Body',
            'addedByAnotherExtension' => 'accepted',
            'poll'                    => 'swept',
        ]);

        $this->assertSame(['poll' => 'swept'], $body['data']['attributes']['extra']);
        $this->assertSame('resolved elsewhere', $body['data']['attributes']['addedByAnotherExtension']);
    }
}
