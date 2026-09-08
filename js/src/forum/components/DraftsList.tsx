import app from 'flarum/forum/app';
import haptic from 'flarum/common/utils/haptic';
import Component from 'flarum/common/Component';
import HeaderList from 'flarum/forum/components/HeaderList';
import Button from 'flarum/common/components/Button';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Tooltip from 'flarum/common/components/Tooltip';
import ItemList from 'flarum/common/utils/ItemList';
import type Draft from '../models/Draft';
import type DraftsListState from '../states/DraftsListState';
import { setDraftCount } from '../utils/draftCount';
import DraftsListItem from './DraftsListItem';

interface DraftsListAttrs {
  state: DraftsListState;
}

export default class DraftsList extends Component<DraftsListAttrs> {
  protected observer: IntersectionObserver | undefined;

  oncreate(vnode: any) {
    super.oncreate(vnode);

    $('.draft--delete').on('click tap', function (event) {
      event.stopPropagation();
    });

    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.attrs.state.loadMore();
          }
        },
        { rootMargin: '100px' }
      );
    }
  }

  onremove(vnode: any) {
    super.onremove(vnode);

    this.observer?.disconnect();
    this.observer = undefined;
  }

  deleteAll(e: MouseEvent) {
    $(e.currentTarget as HTMLElement).trigger('mouseleave');
    if (!confirm(app.translator.trans('fof-drafts.forum.dropdown.delete_all_alert') as string)) return;

    haptic('heavy');
    app
      .request({
        method: 'DELETE',
        url: app.forum.attribute('apiUrl') + '/drafts/all',
      })
      .then(() => {
        // Clear drafts from store
        const drafts = app.store.all<Draft>('drafts');
        drafts.forEach((draft) => app.store.remove(draft));
        setDraftCount(0);
        m.redraw();
      });
  }

  controlItems() {
    const items = new ItemList();

    items.add(
      'deleteAll',
      <Tooltip showOnFocus={false} text={app.translator.trans('fof-drafts.forum.dropdown.delete_all_button')}>
        <Button
          data-container="body"
          icon="fas fa-trash-can"
          className="Button Button--link Button--icon Alert-dismiss"
          onclick={(e: MouseEvent) => {
            this.deleteAll(e);
          }}
        />
      </Tooltip>
    );

    return items;
  }

  view() {
    const drafts = app.store.all<Draft>('drafts');
    const state = this.attrs.state;

    return (
      <HeaderList
        className="DraftsList"
        title={app.translator.trans('fof-drafts.forum.dropdown.title')}
        controls={this.controlItems()}
        hasItems={drafts.length > 0}
        loading={state.loading}
        emptyText={app.translator.trans('fof-drafts.forum.dropdown.empty_text')}
      >
        <ul className="HeaderListGroup-content">
          {drafts
            .sort((a, b) => (b.updatedAt()?.getTime?.() ?? 0) - (a.updatedAt()?.getTime?.() ?? 0))
            .map((draftItem) => {
              return <DraftsListItem draft={draftItem} state={state} />;
            })}
          {state.hasNextPage && (
            <li
              className="DraftsList--loadMore"
              aria-hidden="true"
              oncreate={(vnode: any) => {
                if (this.observer && vnode.dom) {
                  this.observer.observe(vnode.dom);
                }
              }}
            />
          )}
          {state.loadingMore && (
            <li className="DraftsList--loading">
              <LoadingIndicator size="small" />
            </li>
          )}
        </ul>
      </HeaderList>
    );
  }
}
