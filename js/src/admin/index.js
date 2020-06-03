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
import { settings } from '@fof-components';

const {
    SettingsModal,
    items: { BooleanItem },
} = settings;

app.initializers.add('fof-drafts', (app) => {
    app.extensionSettings['fof-drafts'] = () =>
        app.modal.show(
            new SettingsModal({
                title: app.translator.trans('fof-drafts.admin.settings.title'),
                type: 'small',
                items: [
                    <BooleanItem key="fof-drafts.enable_scheduled_drafts">
                        {app.translator.trans('fof-drafts.admin.settings.enable_scheduled_drafts')}
                    </BooleanItem>,
                    <BooleanItem key="fof-drafts.schedule_on_one_server">
                        {app.translator.trans('fof-drafts.admin.settings.schedule_on_one_server')}
                    </BooleanItem>,
                    <BooleanItem key="fof-drafts.store_log_output">
                        {app.translator.trans('fof-drafts.admin.settings.schedule_log_output')}
                    </BooleanItem>,
                ],
            })
        );

    extend(app, 'getRequiredPermissions', function (required, permission) {
        if (permission === 'user.scheduleDrafts') {
            required.push('user.saveDrafts');
        }
    });

    extend(PermissionGrid.prototype, 'startItems', (items) => {
        items.add('fof-draft-create', {
            icon: 'fa fa-edit',
            label: app.translator.trans('fof-drafts.admin.permissions.start'),
            permission: 'user.saveDrafts',
        });

        items.add('fof-draft-schedule', {
            icon: 'fas fa-calendar-plus',
            label: app.translator.trans('fof-drafts.admin.permissions.schedule'),
            permission: 'user.scheduleDrafts',
        });
    });
});
