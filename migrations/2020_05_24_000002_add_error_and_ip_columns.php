<?php

/*
 * This file is part of fof/drafts.
 *
 * Copyright (c) 2019 FriendsOfFlarum.
 *
 * For the full copyright and license information, please view the LICENSE.md
 * file that was distributed with this source code.
 */

use Flarum\Database\Migration;

return Migration::addColumns('drafts', [
    'scheduled_validation_error' => ['mediumText', 'nullable' => true],
    'ip_address'                 => ['string', 'length' => 45, 'nullable' => true],
]);
