/*
 *
 *  This file is part of fof/drafts.
 *
 *  Copyright (c) 2019 FriendsOfFlarum.
 *
 *  For the full copyright and license information, please view the LICENSE.md
 *  file that was distributed with this source code.
 *
 */

import app from 'flarum/app';
import { extend } from 'flarum/extend';
import PermissionGrid from 'flarum/components/PermissionGrid';

app.initializers.add('fof-drafts', app => {
    extend(PermissionGrid.prototype, 'startItems', items => {
        items.add('fof-draft-create', {
            icon: 'fa fa-edit',
            label: app.translator.trans('fof-drafts.admin.permissions.start'),
            permission: 'user.saveDrafts',
        });
    });
});
