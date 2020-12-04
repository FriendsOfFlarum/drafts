<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) 2019 FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE.md
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Api\Controller;

use Flarum\Api\Controller\AbstractListController;
use Flarum\User\User;
use FoF\Drafts\Api\Serializer\DraftSerializer;
use FoF\Drafts\Draft;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;

class ListDraftsController extends AbstractListController
{
    /**
     * {@inheritdoc}
     */
    public $serializer = DraftSerializer::class;

    /**
     * {@inheritdoc}
     */
    public $include = [
        'user',
    ];

    /**
     * {@inheritdoc}
     */
    protected function data(ServerRequestInterface $request, Document $document)
    {
        /**
         * @var User
         */
        $actor = $request->getAttribute('actor');

        $actor->assertCan('user.saveDrafts');

        return Draft::where('user_id', $actor->id)->get();
    }
}
