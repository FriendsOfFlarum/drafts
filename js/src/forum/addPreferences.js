import { extend, override } from 'flarum/extend';
import FieldSet from 'flarum/components/FieldSet';
import SettingsPage from 'flarum/components/SettingsPage';
import Switch from "flarum/components/Switch";
import ItemList from 'flarum/utils/ItemList';

export default function () {
    extend(SettingsPage.prototype, 'settingsItems', function (items) {
        console.log(this)
        items.add(
            'drafts',
            FieldSet.component({
                label: app.translator.trans('fof-drafts.forum.user.settings.drafts_heading'),
                className: 'Settings-drafts',
                children: this.draftsItems().toArray(),
            })
        );
    });


    SettingsPage.prototype['draftsItems'] = function() {
        const items = new ItemList();

        console.log(this)

        items.add('drafts-disable-draft-autosave',
            Switch.component({
                children: app.translator.trans('fof-drafts.forum.user.settings.disable_draft_autosave'),
                state: this.user.preferences().disableDraftAutosave,
                onchange: (value, component) => this.preferenceSaver('disableDraftAutosave')(value, component)
            })
        );

        return items;
    };
}
