import {extend} from 'flarum/extend';
import SettingsPage from 'flarum/components/SettingsPage';
import Switch from "flarum/components/Switch";

export default function () {
    extend(SettingsPage.prototype, 'privacyItems', function (items) {
        items.add('drafts-disable-draft-autosave',
            Switch.component({
                children: app.translator.trans('fof-drafts.forum.user.settings.disable_draft_autosave'),
                state: this.user.preferences().disableDraftAutosave,
                onchange: (value, component) => this.preferenceSaver('disableDraftAutosave')(value, component)
            })
        )
    });
}
