<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) 2019 FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE.md
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
     * {@inheritdoc}
     */
    protected function getDefaultAttributes($draft)
    {
        return [
            'title'         => $draft->title,
            'content'       => $draft->content,
            'relationships' => json_decode($draft->relationships),
            'updatedAt'     => $this->formatDate($draft->updated_at),
        ];
    }

    /**
     * @param $username_request
     *
     * @return \Tobscure\JsonApi\Relationship
     */
    protected function user($draft)
    {
        return $this->hasOne($draft, BasicUserSerializer::class);
    }
}
