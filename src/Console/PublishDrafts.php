<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Console;

use Carbon\Carbon;
use Flarum\Console\AbstractCommand;
use Flarum\Discussion\Command\StartDiscussion;
use Flarum\Foundation\ValidationException;
use Flarum\Post\Command\PostReply;
use Flarum\Settings\SettingsRepositoryInterface;
use FoF\Drafts\Draft;
use Illuminate\Contracts\Bus\Dispatcher;
use Symfony\Contracts\Translation\TranslatorInterface;

class PublishDrafts extends AbstractCommand
{
    protected $bus;
    protected $settings;
    protected $translator;

    public function __construct(Dispatcher $bus, SettingsRepositoryInterface $settings, TranslatorInterface $translator)
    {
        parent::__construct();
        $this->bus = $bus;
        $this->settings = $settings;
        $this->translator = $translator;
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

        if (!$this->settings->get('fof-drafts.enable_scheduled_drafts')) {
            $this->error($this->translator->trans('fof-drafts.console.scheduled_drafts_disabled'));

            return;
        }

        foreach (Draft::where('scheduled_for', '<=', Carbon::now())->with('user')->get() as $draft) {
            try {
                $relationships = json_decode($draft->relationships, true);
                $discussionId = $relationships['discussion']['data']['id'];

                $this->info("Publishing draft reply for discussion {$discussionId}");

                if (array_key_exists('discussion', $relationships)) {
                    $post = $this->bus->dispatch(
                        new PostReply($discussionId, $draft->user, [
                            'attributes' => [
                                'content' => $draft->content,
                            ],
                        ], $draft->ip_address)
                    );
                    $post->created_at = $draft->scheduled_for;
                    $post->save();
                } else {
                    $discussion = $this->bus->dispatch(
                        new StartDiscussion($draft->user, [
                            'attributes' => [
                                'title'   => $draft->title,
                                'content' => $draft->content,
                            ],
                            'relationships' => $relationships,
                        ], $draft->ip_address)
                    );
                    $discussion->created_at = $draft->scheduled_for;
                    $discussion->firstPost->created_at = $draft->scheduled_for;
                    $discussion->save();
                    $discussion->firstPost->save();

                    $this->info("Published draft discussion: $discussion->id");
                }
                $draft->delete();
            } catch (ValidationException $e) {
                $draft->scheduled_validation_error = $e->getMessage();
                $draft->save();
                echo $e->getMessage();
            }
        }

        $this->info('Done.');
    }
}
