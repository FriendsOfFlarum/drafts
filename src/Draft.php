<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace FoF\Drafts;

use Flarum\Database\AbstractModel;
use Flarum\Database\ScopeVisibilityTrait;
use Flarum\User\User;

/**
 * @property int                 $id
 * @property int                 $user_id
 * @property string|null         $title
 * @property string|null         $content
 * @property string              $relationships
 * @property \Carbon\Carbon|null $updated_at
 * @property \Carbon\Carbon|null $scheduled_for
 * @property string              $ip_address
 * @property string              $scheduled_validation_error
 * @property string              $extra
 */
class Draft extends AbstractModel
{
    use ScopeVisibilityTrait;

    protected $casts = [
        'updated_at'    => 'datetime',
        'scheduled_for' => 'datetime',
    ];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
