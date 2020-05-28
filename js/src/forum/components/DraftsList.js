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
import DiscussionComposer from 'flarum/components/DiscussionComposer';
import ReplyComposer from 'flarum/components/ReplyComposer';
import avatar from 'flarum/helpers/avatar';
import icon from 'flarum/helpers/icon';
import humanTime from 'flarum/helpers/humanTime';
import { truncate } from 'flarum/utils/string';
import Button from 'flarum/components/Button';
import ScheduleDraftModal from './ScheduleDraftModal';
import fillRelationship from '../utils/fillRelationship';

export default class DraftsList extends Component {
    config(isInitialized) {
        if (!isInitialized) return;

        $('.draft--delete').on('click tap', function (event) {
            event.stopPropagation();
        });
    }

    view() {
        const drafts = app.store.all('drafts');

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
                                              <a onclick={this.showComposer.bind(this, draft)} className="Notification draft--item">
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
                                                          this.deleteDraft(draft);
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
                                                                this.scheduleDraft(draft);
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

                        {this.loading
                            ? LoadingIndicator.component({ className: 'LoadingIndicator--block' })
                            : !drafts.length && (
                                  <div className="NotificationList-empty">{app.translator.trans('fof-drafts.forum.dropdown.empty_text')}</div>
                              )}
                    </ul>
                </div>
            </div>
        );
    }

    deleteDraft(draft) {
        this.loading = true;

        if (!window.confirm(app.translator.trans('fof-drafts.forum.dropdown.alert'))) return;

        draft.delete().then(() => {
            if (app.composer.component && app.composer.component.draft.id() === draft.id() && !app.composer.changed()) {
                app.composer.hide();
            }

            this.loading = false;
            m.redraw();
        });
    }

    scheduleDraft(draft) {
        if (!app.forum.attribute('canScheduleDrafts') || !app.forum.attribute('drafts.enableScheduledDrafts')) return;

        app.modal.show(new ScheduleDraftModal({ draft }));
    }

    showComposer(draft) {
        if (this.loading) return;

        const deferred = m.deferred();

        let componentClass;

        switch (draft.type()) {
            case 'privateDiscussion':
                componentClass = require('@fof-byobu').components['PrivateDiscussionComposer'];
                break;
            case 'reply':
                componentClass = ReplyComposer;
                break;
            default:
                componentClass = DiscussionComposer;
        }

        const component = new componentClass(draft.compileData());

        app.composer.load(component);
        app.composer.show();

        deferred.resolve(component);

        return deferred.promise;
    }

    load() {
        if (app.cache.draftsLoaded) {
            return;
        }

        this.loading = true;
        m.redraw();

        app.store
            .find('drafts')
            .then(
                () => (app.cache.draftsLoaded = true),
                () => {}
            )
            .then(() => {
                this.loading = false;
                m.redraw();
            });
    }
}
