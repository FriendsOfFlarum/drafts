<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace FoF\Drafts\Data;

use Blomstra\Gdpr\Data\Type;
use FoF\Drafts\Draft;
use Illuminate\Support\Arr;

class Drafts extends Type
{
    public static function exportDescription(): string
    {
        return 'All drafts created by the user.';
    }

    public function export(): ?array
    {
        $dataExport = [];

        Draft::query()
            ->where('user_id', $this->user->id)
            ->each(function (Draft $draft) use (&$dataExport) {
                $dataExport[] = ["drafts/draft-{$draft->id}.json" => $this->encodeForExport($this->sanitize($draft))];
            });

        return $dataExport;
    }

    protected function sanitize(Draft $draft): array
    {
        return Arr::except($draft->toArray(), [
            'user_id', 'relationships', 'scheduled_validation_error', 'extra',
        ]);
    }

    public static function anonymizeDescription(): string
    {
        return self::deleteDescription();
    }

    public function anonymize(): void
    {
        // In the case of drafts, it makes no sense to keep them after a user is anonymized.
        $this->delete();
    }

    public static function deleteDescription(): string
    {
        return 'Delete all drafts created by the user.';
    }

    public function delete(): void
    {
        Draft::query()
            ->where('user_id', $this->user->id)
            ->delete();
    }
}
