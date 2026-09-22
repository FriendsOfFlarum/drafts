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
use Flarum\Api\Resource\AbstractResource;
use Flarum\Api\Resource\DiscussionResource;
use Flarum\Api\Resource\PostResource;
use Flarum\Console\AbstractCommand;
use Flarum\Foundation\KnownError;
use Flarum\Foundation\ValidationException;
use Flarum\Settings\SettingsRepositoryInterface;
use FoF\Drafts\Draft;
use ReflectionClass;
use Symfony\Contracts\Translation\TranslatorInterface;
use Throwable;
use Tobyz\JsonApiServer\Exception\ErrorProvider;
use Tobyz\JsonApiServer\Schema\Field\Attribute;

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

                    $post = $this->api->forResource(PostResource::class)
                        ->forEndpoint('create')
                        ->process([
                            'data' => [
                                'type'       => 'posts',
                                'attributes' => $this->attributesFor($draft, PostResource::class, [
                                    'content' => $draft->content,
                                ]),
                                'relationships' => [
                                    'discussion' => [
                                        'data' => [
                                            'type' => 'discussions',
                                            'id'   => (string) $discussionId,
                                        ],
                                    ],
                                ],
                            ],
                        ], [], ['actor' => $draft->user]);

                    $post->created_at = $draft->scheduled_for;
                    $post->ip_address = $draft->ip_address;
                    $post->save();
                } else {
                    if (empty(trim((string) $draft->title))) {
                        $draft->scheduled_validation_error = $this->translator->trans('fof-drafts.console.no_title_error');
                        $draft->save();
                        $this->error("Draft {$draft->id} skipped: discussion title is missing.");
                        continue;
                    }

                    $this->info('Publishing draft discussion');

                    $attributes = $this->attributesFor($draft, DiscussionResource::class, [
                        'title'   => $draft->title,
                        'content' => $draft->content,
                    ]);

                    $discussion = $this->api->forResource(DiscussionResource::class)
                        ->forEndpoint('create')
                        ->process([
                            'data' => [
                                'type'          => 'discussions',
                                'attributes'    => $attributes,
                                'relationships' => $relationships,
                            ],
                        ], [], ['actor' => $draft->user]);

                    $discussion->created_at = $draft->scheduled_for;
                    $discussion->save();

                    // saveModel() always sets first_post_id so this should resolve, but the
                    // relation is lazy-loaded rather than assigned — guard it rather than let
                    // a null take down the whole batch.
                    if (($firstPost = $discussion->firstPost) !== null) {
                        $firstPost->created_at = $draft->scheduled_for;
                        $firstPost->ip_address = $draft->ip_address;
                        $firstPost->save();
                    }

                    $this->info("Published draft discussion: $discussion->id");
                }
                $draft->delete();
            } catch (ErrorProvider|KnownError|ValidationException $e) {
                // Every way the API layer refuses a draft. Record and move on — one
                // unpublishable draft must not stop the batch. Anything else is a defect
                // or an infrastructure failure and deliberately aborts the run, so the
                // cron exit code reports it instead of a field only the author sees.
                $message = $this->describeError($e);

                $draft->scheduled_validation_error = $message;
                $draft->save();

                $this->error("Draft {$draft->id} could not be published: {$message}");
            }
        }

        $this->info('Done.');

        return AbstractCommand::SUCCESS;
    }

    /**
     * The draft's own columns win: `extra` is a client-supplied blob and must not
     * rewrite the title or content the draft holds.
     *
     * Keys the target resource no longer declares are dropped rather than forwarded —
     * disabling the extension that owned one would otherwise make every draft holding
     * it permanently unpublishable, re-failing on every cron tick. Publishing without
     * the key is the lesser loss.
     *
     * @param class-string<AbstractResource> $resourceClass
     * @param array<string, mixed>           $own
     *
     * @return array<string, mixed>
     */
    protected function attributesFor(Draft $draft, string $resourceClass, array $own): array
    {
        $extra = $draft->extra;

        if (! is_array($extra) || $extra === []) {
            return $own;
        }

        return array_merge(array_intersect_key($extra, $this->declaredAttributesOf($resourceClass)), $own);
    }

    /**
     * Resolved at call time, so fields other enabled extensions contribute via
     * Extend\ApiResource->fields() count as declared too.
     *
     * @param class-string<AbstractResource> $resourceClass
     *
     * @return array<string, true>
     */
    protected function declaredAttributesOf(string $resourceClass): array
    {
        /** @var AbstractResource $resource */
        $resource = $this->api->getResource($resourceClass);

        $names = [];

        foreach ($resource->resolveFields() as $field) {
            // An `extra` key sharing a relationship's name is still unknown at the
            // attributes location.
            if ($field instanceof Attribute) {
                $names[$field->name] = true;
            }
        }

        return $names;
    }

    /**
     * UnprocessableEntityException::getMessage() is a print_r() dump, so the JSON:API
     * error objects — not the message — are the only usable source for these.
     */
    protected function describeError(Throwable $e): string
    {
        if ($e instanceof ErrorProvider) {
            $parts = [];

            foreach ($e->getJsonApiErrors() as $error) {
                $text = (string) ($error['detail'] ?? $error['title'] ?? '');
                $pointer = $error['source']['pointer'] ?? null;

                if ($pointer !== null) {
                    $text = $text === '' ? (string) $pointer : "{$pointer}: {$text}";
                }

                if ($text !== '') {
                    $parts[] = $text;
                }
            }

            if ($parts !== []) {
                return implode("\n", $parts);
            }
        }

        $message = trim($e->getMessage());

        if ($message !== '') {
            return $message;
        }

        // KnownError instances such as PermissionDeniedException carry no message.
        return $e instanceof KnownError
            ? $e->getType()
            : (new ReflectionClass($e))->getShortName();
    }
}
