<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Api\Serializer;

use Flarum\Api\Serializer\AbstractSerializer;
use Flarum\Api\Serializer\BasicDiscussionSerializer;
use Flarum\Api\Serializer\BasicUserSerializer;
use Flarum\Api\Serializer\GroupSerializer;
use Flarum\Discussion\Discussion;
use Flarum\Group\Group;
use Flarum\User\User;
use Illuminate\Support\Arr;

class DraftSerializer extends AbstractSerializer
{
    /**
     * {@inheritdoc}
     */
    protected $type = 'drafts';

    /**
     * @param \FoF\Drafts\Draft $draft
     */
    protected function getDefaultAttributes($draft)
    {
        return [
            'title'                    => $draft->title,
            'content'                  => $draft->content,
            'extra'                    => $draft->extra ? json_decode($draft->extra) : null,
            'scheduledValidationError' => $draft->scheduled_validation_error,
            'scheduledFor'             => $this->formatDate($draft->scheduled_for),
            'updatedAt'                => $this->formatDate($draft->updated_at),
        ];
    }

    /**
     * @return \Tobscure\JsonApi\Relationship
     */
    protected function user($draft)
    {
        return $this->hasOne($draft, BasicUserSerializer::class);
    }

    /**
     * @return \Tobscure\JsonApi\Relationship|null
     */
    protected function discussion($draft)
    {
        if (! $discussionId = Arr::get($this->getRelationshipData($draft), 'discussion.data.id')) {
            return null;
        }

        return $this->hasOne($draft, BasicDiscussionSerializer::class, function () use ($discussionId) {
            return Discussion::query()->find($discussionId);
        });
    }

    /**
     * @return \Tobscure\JsonApi\Relationship|null
     */
    protected function recipientUsers($draft)
    {
        $userIds = collect(Arr::get($this->getRelationshipData($draft), 'recipientUsers.data', []))
            ->pluck('id')
            ->filter()
            ->all();

        if ($userIds === []) {
            return null;
        }

        return $this->hasMany($draft, BasicUserSerializer::class, function () use ($userIds) {
            return User::query()->whereIn('id', $userIds)->get();
        });
    }

    /**
     * @return \Tobscure\JsonApi\Relationship|null
     */
    protected function recipientGroups($draft)
    {
        $groupIds = collect(Arr::get($this->getRelationshipData($draft), 'recipientGroups.data', []))
            ->pluck('id')
            ->filter()
            ->all();

        if ($groupIds === []) {
            return null;
        }

        return $this->hasMany($draft, GroupSerializer::class, function () use ($groupIds) {
            return Group::query()->whereIn('id', $groupIds)->get();
        });
    }

    /**
     * @return array<string, mixed>
     */
    protected function getRelationshipData($draft): array
    {
        $relationships = json_decode($draft->relationships ?? '', true);

        return is_array($relationships) ? $relationships : [];
    }
}
