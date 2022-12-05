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

import app from 'flarum/admin/app';
import { extend } from 'flarum/common/extend';

app.initializers.add('fof-drafts', () => {
  app.extensionData
    .for('fof-drafts')
    .registerSetting({
      setting: 'fof-drafts.enable_scheduled_drafts',
      label: app.translator.trans('fof-drafts.admin.settings.enable_scheduled_drafts'),
      type: 'boolean',
    })
    .registerSetting({
      setting: 'fof-drafts.schedule_on_one_server',
      label: app.translator.trans('fof-drafts.admin.settings.schedule_on_one_server'),
      type: 'boolean',
    })
    .registerSetting({
      setting: 'fof-drafts.store_log_output',
      label: app.translator.trans('fof-drafts.admin.settings.schedule_log_output'),
      type: 'boolean',
    })
    .registerPermission(
      {
        icon: 'fas fa-edit',
        label: app.translator.trans('fof-drafts.admin.permissions.start'),
        permission: 'user.saveDrafts',
      },
      'start'
    )
    .registerPermission(
      {
        icon: 'fas fa-calendar-plus',
        label: app.translator.trans('fof-drafts.admin.permissions.schedule'),
        permission: 'user.scheduleDrafts',
      },
      'start'
    );

  extend(app, 'getRequiredPermissions', function (required, permission) {
    if (permission === 'user.scheduleDrafts') {
      required.push('user.saveDrafts');
    }
  });
});
