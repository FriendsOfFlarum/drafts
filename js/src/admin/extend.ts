import Extend from 'flarum/common/extenders';
import app from 'flarum/admin/app';

export default [
  new Extend.Admin()
    .setting(() => ({
      setting: 'fof-drafts.enable_scheduled_drafts',
      label: app.translator.trans('fof-drafts.admin.settings.enable_scheduled_drafts'),
      type: 'boolean',
    }))
    .setting(() => ({
      setting: 'fof-drafts.schedule_on_one_server',
      label: app.translator.trans('fof-drafts.admin.settings.schedule_on_one_server'),
      type: 'boolean',
    }))
    .setting(() => ({
      setting: 'fof-drafts.store_log_output',
      label: app.translator.trans('fof-drafts.admin.settings.schedule_log_output'),
      type: 'boolean',
    }))
    .permission(
      () => ({
        icon: 'fas fa-edit',
        label: app.translator.trans('fof-drafts.admin.permissions.start'),
        permission: 'user.saveDrafts',
      }),
      'start'
    )
    .permission(
      () => ({
        icon: 'fas fa-calendar-plus',
        label: app.translator.trans('fof-drafts.admin.permissions.schedule'),
        permission: 'user.scheduleDrafts',
      }),
      'start'
    ),
];
