import { extend } from 'flarum/common/extend';
import app from 'flarum/forum/app';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';
import DraftsDropdown from './components/DraftsDropdown';

export default function () {
  extend(HeaderSecondary.prototype, 'items', function (items) {
    if (!app.session.user || !app.forum.attribute<boolean>('canSaveDrafts')) return;

    items.add('Drafts', <DraftsDropdown state={(app as any).drafts} />, 20);
  });
}
