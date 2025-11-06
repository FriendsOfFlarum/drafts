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
use Flarum\Api\JsonApi;
use Flarum\Api\Resource\DiscussionResource;
use Flarum\Api\Resource\PostResource;
use Flarum\Console\AbstractCommand;
use Flarum\Foundation\ValidationException;
use Flarum\Settings\SettingsRepositoryInterface;
use FoF\Drafts\Draft;
use Symfony\Contracts\Translation\TranslatorInterface;

class PublishDrafts extends AbstractCommand
{
    public function __construct(protected JsonApi $api, protected SettingsRepositoryInterface $settings, protected TranslatorInterface $translator)
    {
        parent::__construct();
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
    protected function fire(): int
    {
        $this->info('Starting...');

        if (!$this->settings->get('fof-drafts.enable_scheduled_drafts')) {
            $this->error($this->translator->trans('fof-drafts.console.scheduled_drafts_disabled'));

            return AbstractCommand::FAILURE;
        }

        foreach (Draft::where('scheduled_for', '<=', Carbon::now())->with('user')->get() as $draft) {
            try {
                $relationships = $draft->relationships;

                if (is_array($relationships) && isset($relationships['discussion']['data']['id'])) {
                    $discussionId = $relationships['discussion']['data']['id'];
                    $this->info("Publishing draft reply for discussion {$discussionId}");

                    // Create a post reply using JsonApi
                    $post = $this->api->forResource(PostResource::class)
                        ->forEndpoint('create')
                        ->process([
                            'data' => [
                                'type' => 'posts',
                                'attributes' => [
                                    'content' => $draft->content,
                                ],
                                'relationships' => [
                                    'discussion' => [
                                        'data' => [
                                            'type' => 'discussions',
                                            'id' => (string) $discussionId,
                                        ],
                                    ],
                                ],
                            ],
                        ], [], ['actor' => $draft->user]);

                    $post->created_at = $draft->scheduled_for;
                    $post->save();
                } else {
                    $this->info('Publishing draft discussion');

                    // Create a new discussion using JsonApi
                    $attributes = [
                        'title' => $draft->title,
                        'content' => $draft->content,
                    ];

                    // Merge any extra attributes (e.g., tags, etc.) stored in the draft
                    if (is_array($draft->extra) && !empty($draft->extra)) {
                        $attributes = array_merge($attributes, $draft->extra);
                    }

                    $discussion = $this->api->forResource(DiscussionResource::class)
                        ->forEndpoint('create')
                        ->process([
                            'data' => [
                                'type' => 'discussions',
                                'attributes' => $attributes,
                                'relationships' => $relationships,
                            ],
                        ], [], ['actor' => $draft->user]);

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

        return AbstractCommand::SUCCESS;
    }
}
