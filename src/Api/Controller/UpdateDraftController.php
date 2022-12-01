<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Api\Controller;

use Flarum\Api\Controller\AbstractShowController;
use Flarum\Http\RequestUtil;
use FoF\Drafts\Api\Serializer\DraftSerializer;
use FoF\Drafts\Command\UpdateDraft;
use Illuminate\Contracts\Bus\Dispatcher;
use Illuminate\Support\Arr;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;

class UpdateDraftController extends AbstractShowController
{
    public $serializer = DraftSerializer::class;

    /**
     * @var Dispatcher
     */
    protected $bus;

    /**
     * @param Dispatcher $bus
     */
    public function __construct(Dispatcher $bus)
    {
        $this->bus = $bus;
    }

    /**
     * {@inheritdoc}
     */
    protected function data(ServerRequestInterface $request, Document $document)
    {
        $actor = RequestUtil::getActor($request);
        $ipAddress = $request->getAttribute('ipAddress');

        return $this->bus->dispatch(
            new UpdateDraft(Arr::get($request->getQueryParams(), 'id'), $actor, Arr::get($request->getParsedBody(), 'data', []), $ipAddress)
        );
    }
}
