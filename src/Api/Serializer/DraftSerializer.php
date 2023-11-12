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
use Flarum\Api\Serializer\BasicUserSerializer;

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
            'relationships'            => $draft->relationships ? json_decode($draft->relationships) : null,
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
}
