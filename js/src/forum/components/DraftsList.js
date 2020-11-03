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

import Component from 'flarum/Component';
import LoadingIndicator from 'flarum/components/LoadingIndicator';
import avatar from 'flarum/helpers/avatar';
import icon from 'flarum/helpers/icon';
import humanTime from 'flarum/helpers/humanTime';
import { truncate } from 'flarum/utils/string';
import Button from 'flarum/components/Button';

export default class DraftsList extends Component {
    oncreate(vnode) {
        super.oncreate(vnode);

        $('.draft--delete').on('click tap', function (event) {
            event.stopPropagation();
        });
    }

    view() {
        const drafts = app.store.all('drafts');
        const state = this.attrs.state;

        return (
            <div className="NotificationList DraftsList">
                <div className="NotificationList-header">
                    <h4 className="App-titleControl App-titleControl--text">{app.translator.trans('fof-drafts.forum.dropdown.title')}</h4>
                </div>
                <div className="NotificationList-content">
                    <ul className="NotificationGroup-content">
                        {drafts.length
                            ? drafts
                                  .sort((a, b) => b.updatedAt() - a.updatedAt())
                                  .map((draft) => {
                                      return (
                                          <li>
                                              <a onclick={state.showComposer.bind(state, draft)} className="Notification draft--item">
                                                  {avatar(draft.user())}
                                                  {icon(draft.icon(), { className: 'Notification-icon' })}
                                                  <span className="Notification-content">
                                                      {draft.type() === 'reply' ? draft.loadRelationships().discussion.title() : draft.title()}
                                                  </span>
                                                  {humanTime(draft.updatedAt())}
                                                  {Button.component({
                                                      icon: 'fas fa-times',
                                                      style: 'float: right; z-index: 20;',
                                                      className: 'Button Button--icon Button--link draft--delete draft--delete',
                                                      title: app.translator.trans('fof-drafts.forum.dropdown.delete_button'),
                                                      onclick: (e) => {
                                                          state.deleteDraft(draft);
                                                          e.stopPropagation();
                                                      },
                                                  })}
                                                  {app.forum.attribute('canScheduleDrafts') && app.forum.attribute('drafts.enableScheduledDrafts')
                                                      ? Button.component({
                                                            icon: draft.scheduledValidationError()
                                                                ? 'fas fa-calendar-times'
                                                                : draft.scheduledFor()
                                                                ? 'fas fa-calendar-check'
                                                                : 'fas fa-calendar-plus',
                                                            style: 'float: right; z-index: 20;',
                                                            className: 'Button Button--icon Button--link draft--schedule',
                                                            title: app.translator.trans('fof-drafts.forum.dropdown.schedule_button'),
                                                            onclick: (e) => {
                                                                state.scheduleDraft(draft);
                                                                e.stopPropagation();
                                                            },
                                                        })
                                                      : ''}
                                                  <div className="Notification-excerpt">{truncate(draft.content(), 200)}</div>
                                                  {draft.scheduledValidationError() ? (
                                                      <p className="scheduledValidationError">{draft.scheduledValidationError()}</p>
                                                  ) : (
                                                      ''
                                                  )}
                                              </a>
                                          </li>
                                      );
                                  })
                            : ''}

                        {state.loading
                            ? LoadingIndicator.component({ className: 'LoadingIndicator--block' })
                            : !drafts.length && (
                                  <div className="NotificationList-empty">{app.translator.trans('fof-drafts.forum.dropdown.empty_text')}</div>
                              )}
                    </ul>
                </div>
            </div>
        );
    }
}
