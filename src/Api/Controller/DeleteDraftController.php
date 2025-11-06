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

use Flarum\Api\Controller\AbstractDeleteController;
use Flarum\Http\RequestUtil;
use FoF\Drafts\Command\DeleteDraft;
use Illuminate\Contracts\Bus\Dispatcher;
use Illuminate\Support\Arr;
use Psr\Http\Message\ServerRequestInterface;

class DeleteDraftController extends AbstractDeleteController
{
    public function __construct(protected Dispatcher $bus)
    {
    }

    /**
     * {@inheritdoc}
     */
    protected function delete(ServerRequestInterface $request): void
    {
        $actor = RequestUtil::getActor($request);

        $this->bus->dispatch(
            new DeleteDraft(Arr::get($request->getQueryParams(), 'id'), $actor)
        );
    }
}
