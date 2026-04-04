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

import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Button from 'flarum/common/components/Button';
import DraftsListItem from './DraftsListItem';
import Tooltip from 'flarum/common/components/Tooltip';

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

  view() {
    const drafts = app.store.all('drafts');
    const state = this.attrs.state;

    return (
      <div className="NotificationList DraftsList">
        <div className="NotificationList-header">
          <h4 className="App-titleControl App-titleControl--text">{app.translator.trans('fof-drafts.forum.dropdown.title')}</h4>
          <div class="App-primaryControl">
            <Tooltip showOnFocus={false} text={app.translator.trans('fof-drafts.forum.dropdown.delete_all_button')}>
              <Button
                data-container="body"
                icon="fas fa-trash-alt"
                className="Button Button--link Button--icon Alert-dismiss"
                onclick={this.deleteAll.bind(this)}
              />
            </Tooltip>
          </div>
        </div>
        <div className="NotificationList-content">
          <ul className="NotificationGroup-content">
            {drafts.length
              ? drafts
                  .sort((a, b) => b.updatedAt() - a.updatedAt())
                  .map((draft) => {
                    return <DraftsListItem draft={draft} state={state} />;
                  })
              : null}

            {state.loading ? (
              <LoadingIndicator display="block" />
            ) : (
              !drafts.length && <div className="NotificationList-empty">{app.translator.trans('fof-drafts.forum.dropdown.empty_text')}</div>
            )}
          </ul>
        </div>
      </div>
    );
  }
}
