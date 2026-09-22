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
     * 2.x rejects attributes no field declares, so one extension adding a key to
     * DiscussionComposer::data() breaks draft saving; 1.x kept them in `extra`.
     * before() is the only hook ahead of that rejection, as fof/byobu does for tags.
     *
     * Undeclared siblings beat an explicit `extra`; without one the stored blob is the
     * base, so a partial PATCH cannot wipe it.
     */
    protected function foldUndeclaredAttributesIntoExtra(Context $context): void
    {
        $body = $context->request->getParsedBody();

        if (!is_array($body) || !isset($body['data']['attributes']) || !is_array($body['data']['attributes'])) {
            return;
        }

        $attributes = $body['data']['attributes'];

        // resolveFields() includes other extensions' fields, so this cannot drift.
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
