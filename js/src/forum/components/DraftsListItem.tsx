import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import avatar from 'flarum/common/helpers/avatar';
import icon from 'flarum/common/helpers/icon';
import humanTime from 'flarum/common/helpers/humanTime';
import { truncate } from 'flarum/common/utils/string';
import Button from 'flarum/common/components/Button';
import Tooltip from 'flarum/common/components/Tooltip';
import dayjs from 'dayjs';

import type Mithril from 'mithril';
import Draft from '../models/Draft';
import DraftsListState from '../states/DraftsListState';

export interface IAttrs {
  draft: Draft;
  state: DraftsListState;
}

export default class DraftsListItem extends Component<IAttrs> {
  private canSchedule: boolean = app.forum.attribute<boolean>('canScheduleDrafts') && app.forum.attribute<boolean>('drafts.enableScheduledDrafts');

  oncreate(vnode: Mithril.Vnode) {
    super.oncreate(vnode);
  }

  view() {
    const { draft, state } = this.attrs;

    let scheduledDraftIcon = 'far fa-calendar-plus';
    if (draft.scheduledValidationError()) scheduledDraftIcon = 'far fa-calendar-times';
    else if (draft.scheduledFor()) scheduledDraftIcon = 'far fa-calendar-check';

    return (
      <li>
        <a onclick={state.showComposer.bind(state, draft)} className="Notification draft--item">
          {/* Avatar */}
          {avatar(draft.user())}

          {/* Draft icon */}
          {icon(draft.icon(), { className: 'Notification-icon' })}

          {/* Draft title + last edited time */}
          <span class="Notification-title">
            <span className="Notification-content">
              {draft.scheduledFor() && (
                <Tooltip
                  showOnFocus={false}
                  text={app.translator.trans('fof-drafts.forum.dropdown.scheduled_icon_tooltip', {
                    datetime: dayjs(draft.scheduledFor()).format(
                      app.translator.trans('fof-drafts.forum.dropdown.scheduled_icon_tooltip_formatter')[0]
                    ),
                  })}
                >
                  {icon('far fa-clock', { className: 'draft--scheduledIcon' })}
                </Tooltip>
              )}
              {draft.type() === 'reply' ? draft.loadRelationships().discussion.title() : draft.title()}
            </span>
            <span class="Notification-title-spring" />
            {humanTime(draft.updatedAt())}
          </span>

          <div class="Notification-action">
            {/* Delete draft icon */}
            <Tooltip showOnFocus={false} text={app.translator.trans('fof-drafts.forum.dropdown.delete_button')}>
              <Button
                data-container="body"
                icon="fas fa-trash-alt"
                className="Notification-action Button Button--link hasIcon draft--delete"
                onclick={(e: MouseEvent) => {
                  state.deleteDraft(draft);
                  e.stopPropagation();
                }}
              />
            </Tooltip>

            {this.canSchedule ? (
              <Tooltip showOnFocus={false} text={app.translator.trans('fof-drafts.forum.dropdown.schedule_button')}>
                <Button
                  data-container="body"
                  icon={scheduledDraftIcon}
                  className="Notification-action Button Button--link hasIcon draft--schedule"
                  onclick={(e: MouseEvent) => {
                    state.scheduleDraft(draft);
                    e.stopPropagation();
                  }}
                />
              </Tooltip>
            ) : null}
          </div>

          <div className="Notification-excerpt">{truncate(draft.content(), 200)}</div>
          {draft.scheduledValidationError() ? <p className="scheduledValidationError">{draft.scheduledValidationError()}</p> : ''}
        </a>
      </li>
    );
  }
}
