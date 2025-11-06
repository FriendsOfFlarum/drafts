import app from 'flarum/admin/app';
import { extend } from 'flarum/common/extend';

export { default as extend } from './extend';

app.initializers.add('fof-drafts', () => {
  extend(app, 'getRequiredPermissions', function (required, permission) {
    if (permission === 'user.scheduleDrafts') {
      required.push('user.saveDrafts');
    }
  });
});
