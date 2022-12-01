import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import Button from 'flarum/common/components/Button';
import FieldSet from 'flarum/common/components/FieldSet';
import SettingsPage from 'flarum/common/components/SettingsPage';
import Switch from 'flarum/common/components/Switch';
import ItemList from 'flarum/common/utils/ItemList';
import Stream from 'flarum/common/utils/Stream';

export default function () {
  extend(SettingsPage.prototype, 'oninit', function () {
    this.draftAutosaveInterval = Stream(this.user.preferences().draftAutosaveInterval);
  });

  extend(SettingsPage.prototype, 'settingsItems', function (items) {
    if (app.forum.data.attributes.canSaveDrafts) {
      items.add(
        'drafts',
        FieldSet.component(
          {
            label: app.translator.trans('fof-drafts.forum.user.settings.drafts_heading'),
            className: 'Settings-drafts',
          },
          this.draftsItems().toArray()
        )
      );
    }
  });

  SettingsPage.prototype['draftsItems'] = function () {
    const items = new ItemList();

    items.add(
      'draft-autosave-enable',
      Switch.component(
        {
          state: this.user.preferences().draftAutosaveEnable,
          onchange: (value) => {
            this.draftAutosaveEnableLoading = true;

            this.user.savePreferences({ draftAutosaveEnable: value }).then(() => {
              this.draftAutosaveEnableLoading = false;
              m.redraw();
            });
          },
          loading: this.draftAutosaveEnableLoading,
        },
        app.translator.trans('fof-drafts.forum.user.settings.draft_autosave_enable')
      )
    );

    items.add(
      'draft-autosave-interval',
      this.user.preferences().draftAutosaveEnable ? (
        <label>
          <p>{app.translator.trans('fof-drafts.forum.user.settings.draft_autosave_interval_label')}</p>
          <input className="FormControl" type="number" min="0" bidi={this.draftAutosaveInterval} />
          {Button.component(
            {
              className: 'Button Button--primary',
              onclick: () => {
                const isInt = (str) => str == Math.round(str);
                if (this.draftAutosaveInterval() < 0 || !isInt(this.draftAutosaveInterval())) {
                  this.draftAutosaveIntervalInvalid = true;
                  this.draftAutosaveInterval(this.user.preferences().draftAutosaveInterval);
                  m.redraw();
                } else {
                  this.draftAutosaveIntervalInvalid = false;
                  this.user.savePreferences({ draftAutosaveInterval: this.draftAutosaveInterval() }).then(() => {
                    m.redraw();
                  });
                }
              },
            },
            app.translator.trans('fof-drafts.forum.user.settings.draft_autosave_interval_button')
          )}
          {this.draftAutosaveIntervalInvalid ? (
            <p class="invalidInterval">
              <small>{app.translator.trans('fof-drafts.forum.user.settings.draft_autosave_interval_invalid')}</small>
            </p>
          ) : (
            ''
          )}
        </label>
      ) : (
        <p></p>
      )
    );

    return items;
  };
}
