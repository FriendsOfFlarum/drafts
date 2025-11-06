import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import HeaderList from 'flarum/forum/components/HeaderList';
import Button from 'flarum/common/components/Button';
import DraftsListItem from './DraftsListItem';
import Tooltip from 'flarum/common/components/Tooltip';
import ItemList from 'flarum/common/utils/ItemList';

export default class DraftsList extends Component {
  oncreate(vnode) {
    super.oncreate(vnode);

    $('.draft--delete').on('click tap', function (event) {
      event.stopPropagation();
    });
  }

  deleteAll() {
    if (!confirm(app.translator.trans('fof-drafts.forum.dropdown.delete_all_alert'))) return;

    app
      .request({
        method: 'DELETE',
        url: app.forum.attribute('apiUrl') + '/drafts/all',
      })
      .then(() => {
        app.store.data.drafts = [];
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
          icon="fas fa-trash-alt"
          className="Button Button--link Button--icon Alert-dismiss"
          onclick={this.deleteAll.bind(this)}
        />
      </Tooltip>
    );

    return items;
  }

  view() {
    const drafts = app.store.all('drafts');
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
            .sort((a, b) => b.updatedAt() - a.updatedAt())
            .map((draft) => {
              return <DraftsListItem draft={draft} state={state} />;
            })}
        </ul>
      </HeaderList>
    );
  }
}
