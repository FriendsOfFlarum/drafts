import { extend, override } from 'flarum/extend';
import Button from 'flarum/components/Button';
import FieldSet from 'flarum/components/FieldSet';
import SettingsPage from 'flarum/components/SettingsPage';
import Switch from 'flarum/components/Switch';
import ItemList from 'flarum/utils/ItemList';

export default function () {
    extend(SettingsPage.prototype, 'init', function () {
        this.draftAutosaveInterval = m.prop(this.user.preferences().draftAutosaveInterval);
    });

    extend(SettingsPage.prototype, 'settingsItems', function (items) {
        if (app.forum.data.attributes.canSaveDrafts) {
            items.add(
                'drafts',
                FieldSet.component({
                    label: app.translator.trans('fof-drafts.forum.user.settings.drafts_heading'),
                    className: 'Settings-drafts',
                    children: this.draftsItems().toArray(),
                })
            );
        }
    });

    SettingsPage.prototype['draftsItems'] = function () {
        const items = new ItemList();

        items.add(
            'draft-autosave-enable',
            Switch.component({
                children: app.translator.trans('fof-drafts.forum.user.settings.draft_autosave_enable'),
                state: this.user.preferences().draftAutosaveEnable,
                onchange: (value, component) => this.preferenceSaver('draftAutosaveEnable')(value, component),
            })
        );

        items.add(
            'draft-autosave-interval',
            this.user.preferences().draftAutosaveEnable ? (
                <label>
                    <p>{app.translator.trans('fof-drafts.forum.user.settings.draft_autosave_interval_label')}</p>
                    <input
                        className="FormControl"
                        type="number"
                        min="0"
                        value={this.draftAutosaveInterval()}
                        onchange={m.withAttr('value', this.draftAutosaveInterval)}
                    />
                    {Button.component({
                        className: 'Button Button--primary',
                        children: app.translator.trans('fof-drafts.forum.user.settings.draft_autosave_interval_button'),
                        onclick: () => {
                            const isInt = (str) => str == Math.round(str);
                            if (this.draftAutosaveInterval() < 0 || !isInt(this.draftAutosaveInterval())) {
                                this.draftAutosaveIntervalInvalid = true;
                                this.draftAutosaveInterval(this.user.preferences().draftAutosaveInterval);
                                m.redraw();
                            } else {
                                this.draftAutosaveIntervalInvalid = false;
                                this.preferenceSaver('draftAutosaveInterval')(this.draftAutosaveInterval());
                            }
                        },
                    })}
                    {this.draftAutosaveIntervalInvalid ? (
                        <p class="invalidInterval">
                            <small>{app.translator.trans('fof-drafts.forum.user.settings.draft_autosave_interval_invalid')}</small>
                        </p>
                    ) : (
                        ''
                    )}
                </label>
            ) : (
                ''
            )
        );

        return items;
    };
}
