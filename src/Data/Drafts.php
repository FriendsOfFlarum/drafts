<?php

namespace FoF\Drafts\Data;

use Blomstra\Gdpr\Data\Type;
use FoF\Drafts\Draft;
use Illuminate\Support\Arr;
use PhpZip\ZipFile;

class Drafts extends Type
{
    public function export(ZipFile $zip): void
    {
        Draft::query()
            ->where('user_id', $this->user->id)
            ->each(function (Draft $draft) use ($zip) {
                $zip->addFromString(
                    "draft-{$draft->id}.json",
                    json_encode(
                        $this->sanitize($draft),
                        JSON_PRETTY_PRINT
                    )
                );
            });
    }

    protected function sanitize(Draft $draft): array
    {
        return Arr::except($draft->toArray(), [
            'user_id', 'relationships', 'scheduled_validation_error', 'extra'
        ]);
    }

    public function anonymize(): void
    {
        // In the case of drafts, it makes no sense to keep them after a user is anonymized.
        $this->delete();
    }

    public function delete(): void
    {
        Draft::query()
            ->where('user_id', $this->user->id)
            ->delete();
    }
}
