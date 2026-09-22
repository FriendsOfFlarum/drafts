<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Api\Resource;

use Carbon\Carbon;
use Flarum\Api\Context;
use Flarum\Api\Endpoint;
use Flarum\Api\Resource;
use Flarum\Api\Schema;
use Flarum\Api\Sort\SortColumn;
use FoF\Drafts\Draft;
use Illuminate\Database\Eloquent\Builder;
use Laminas\Diactoros\Response\EmptyResponse;
use Tobyz\JsonApiServer\Context as OriginalContext;

/**
 * @extends Resource\AbstractDatabaseResource<Draft>
 */
class DraftResource extends Resource\AbstractDatabaseResource
{
    public function type(): string
    {
        return 'drafts';
    }

    public function routeNamePrefix(): ?string
    {
        return 'fof';
    }

    public function model(): string
    {
        return Draft::class;
    }

    public function scope(Builder $query, OriginalContext $context): void
    {
        $query->whereVisibleTo($context->getActor());
    }

    public function endpoints(): array
    {
        return [
            Endpoint\Create::make()
                ->authenticated()
                ->defaultInclude(['user'])
                ->can('user.saveDrafts')
                ->before($this->foldUndeclaredAttributesIntoExtra(...)),
            Endpoint\Update::make()
                ->authenticated()
                ->can('user.saveDrafts')
                ->visible(fn (Draft $draft, Context $context) => $context->getActor()->id === $draft->user_id)
                ->before($this->foldUndeclaredAttributesIntoExtra(...)),
            Endpoint\Endpoint::make('delete.all')
                ->route('DELETE', '/all')
                ->authenticated()
                ->action(function (Context $context) {
                    Draft::where('user_id', $context->getActor()->id)->delete();
                })
                ->response(fn () => new EmptyResponse(204)),
            Endpoint\Delete::make()
                ->authenticated()
                ->visible(fn (Draft $draft, Context $context) => $context->getActor()->id === $draft->user_id),
            Endpoint\Index::make()
                ->authenticated()
                ->can('user.saveDrafts')
                ->paginate(),
        ];
    }

    public function fields(): array
    {
        return [

            Schema\Str::make('title')
                ->nullable()
                ->minLength(0)
                ->maxLength(255)
                ->writable(),
            Schema\Str::make('content')
                ->requiredOnCreate()
                ->writable()
                ->minLength(1)
                ->maxLength(65535),
            Schema\DateTime::make('updatedAt')
                ->nullable(),
            Schema\Arr::make('extra')
                ->nullable()
                ->writable(),
            Schema\Arr::make('relationships')
                ->nullable()
                ->writable(),
            Schema\DateTime::make('scheduledFor')
                ->nullable()
                ->writable(fn (Draft $draft, Context $context) => $context->getActor()->can('user.scheduleDrafts')),
            Schema\Str::make('scheduledValidationError')
                ->nullable(),
            Schema\Boolean::make('clearValidationError')
                ->writable()
                ->set(function (Draft $draft, bool $value) {
                    if ($value) {
                        $draft->scheduled_validation_error = '';
                    }
                }),

            Schema\Relationship\ToOne::make('user')
                ->includable()
                ->inverse('drafts')
                ->type('users'),
        ];
    }

    /**
     * Any extension may add keys to DiscussionComposer::data(), and those reach the
     * draft payload verbatim. 1.x kept undeclared ones in `extra`; 2.x answers 400
     * "Unknown field [x]" and writes nothing, so a single such extension breaks draft
     * saving forum-wide.
     *
     * before() is the only hook running ahead of that rejection, and Context::$request
     * is public with a lazily-read body, so this rewrite is what parseData() then sees.
     * Same technique as fof/byobu's tag stripping.
     *
     * Merge rules, both deliberate: undeclared siblings beat an explicit `extra`, being
     * the composer's live values; on update without one, the stored blob is the base so
     * a partial PATCH cannot wipe the rest. Clearing a key therefore means sending
     * `extra` explicitly, preserving Schema\Arr's wholesale semantics.
     */
    protected function foldUndeclaredAttributesIntoExtra(Context $context): void
    {
        $body = $context->request->getParsedBody();

        if (! is_array($body) || ! isset($body['data']['attributes']) || ! is_array($body['data']['attributes'])) {
            return;
        }

        $attributes = $body['data']['attributes'];

        // Resolves through resolveFields(), so fields other extensions contribute via
        // Extend\ApiResource->fields() count as declared and this cannot drift.
        $undeclared = array_diff_key($attributes, $context->fields($this));

        if ($undeclared === []) {
            return;
        }

        $base = array_key_exists('extra', $attributes)
            ? (array) ($attributes['extra'] ?? [])
            : ($context->model instanceof Draft ? (array) ($context->model->extra ?? []) : []);

        $attributes = array_diff_key($attributes, $undeclared);
        $attributes['extra'] = array_merge($base, $undeclared);

        $body['data']['attributes'] = $attributes;

        $context->request = $context->request->withParsedBody($body);
    }

    public function creating(object $model, OriginalContext $context): ?object
    {
        $model->user_id = $context->getActor()->id;
        $model->ip_address = $context->request->getAttribute('ipAddress');
        $model->updated_at = Carbon::now();

        return $model;
    }

    public function updating(object $model, OriginalContext $context): ?object
    {
        $model->ip_address = $context->request->getAttribute('ipAddress');
        $model->updated_at = Carbon::now();

        return $model;
    }

    public function sorts(): array
    {
        return [
            // SortColumn::make('createdAt'),
        ];
    }
}
