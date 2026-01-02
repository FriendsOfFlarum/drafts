import { extend } from 'flarum/common/extend';
import app from 'flarum/forum/app';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Component from 'flarum/common/Component';

// Lazy-loaded wrapper for DraftsDropdown
class LazyDraftsDropdown extends Component {
  loading: boolean = true;
  component: any = null;

  oninit(vnode: any) {
    super.oninit(vnode);

    import('./components/DraftsDropdown').then((module) => {
      this.component = module.default;
      this.loading = false;
      m.redraw();
    });
  }

  view(vnode: any) {
    if (this.loading || !this.component) {
      return <LoadingIndicator size="small" />;
    }

    const DraftsDropdown = this.component;
    return <DraftsDropdown {...vnode.attrs} />;
  }
}

export default function () {
  extend(HeaderSecondary.prototype, 'items', function (items) {
    if (!app.session.user || !app.forum.attribute<boolean>('canSaveDrafts')) return;

    items.add('Drafts', <LazyDraftsDropdown state={app.drafts} />, 20);
  });
}
