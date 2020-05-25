<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) 2020 FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE.md
 * file that was distributed with this source code.
 */

namespace Fof\Drafts\Console;

use Carbon\Carbon;
use Flarum\Console\AbstractCommand;
use Flarum\Discussion\Command\StartDiscussion;
use Flarum\Foundation\ValidationException;
use Flarum\Post\Command\PostReply;
use Flarum\User\User;
use FoF\Drafts\Draft;
use Illuminate\Contracts\Bus\Dispatcher;

class PublishDrafts extends AbstractCommand
{
    protected $bus;

    public function __construct(Dispatcher $bus)
    {
        parent::__construct();
        $this->bus = $bus;
    }
    /**
     * {@inheritdoc}
     */
    protected function configure()
    {
        $this
            ->setName('drafts:publish')
            ->setDescription('Publish all scheduled drafts.');
    }

    /**
     * {@inheritdoc}
     */
    protected function fire()
    {
        $this->info('Starting...');

        foreach (Draft::where('scheduled_for', '<=', Carbon::now())->with('user')->get() as $draft) {
            try {
                $relationships = json_decode($draft->relationships, true);
                $ip = '172.0.0.1';

                if (array_key_exists('discussion', $relationships)) {
                    $post = $this->bus->dispatch(
                        new PostReply($relationships['discussion']['id'], $draft->user, ['attributes' => ['content' => $draft->content]], $ip)
                    );
                    $post->created_at = $draft->scheduled_for;
                    $post->save();
                } else {
                    $discussion = $this->bus->dispatch(
                        new StartDiscussion($draft->user, [
                            'attributes' => [
                                'title' => $draft->title,
                                'content' => $draft->content,
                            ],
                            'relationships' => $relationships
                        ], $ip)
                    );
                    $discussion->created_at = $draft->scheduled_for;
                    $discussion->firstPost->created_at = $draft->scheduled_for;
                    $discussion->save();
                    $discussion->firstPost->save();
                }
                $draft->delete();
            } catch (ValidationException $e) {
                $draft->scheduled_validation_error = $e->getMessage();
                $draft->save();
                echo $e->getMessage();
            }
        }
    }
}
