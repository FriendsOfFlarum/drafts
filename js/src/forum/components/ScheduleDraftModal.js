import Alert from 'flarum/components/Alert';
import Button from 'flarum/components/Button';
import Modal from 'flarum/components/Modal';

import flatpickr from "flatpickr";
import * as dayjs from 'dayjs';
import * as localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(localizedFormat);

export default class ScheduleDraftModal extends Modal {
    init() {
        super.init();

        this.loading = false;
    }

    className() {
        return 'ScheduleDraftModal';
    }

    title() {
        return app.translator.trans('fof-drafts.forum.schedule_draft_modal.title');
    }

    content() {
        return [
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css"></link>,
            this.props.draft.scheduledFor() ? <div className="Modal-alert">
                <Alert type="success" dismissible={false}>
                    {app.translator.trans('fof-drafts.forum.schedule_draft_modal.scheduled_text', {datetime: dayjs(this.props.draft.scheduledFor()).format('LLLL')})}
                </Alert>
            </div> : '',
            <input style="display: none"></input>,
            <div className="Modal-body">
                <div className="Form Form--centered">
                    <p className="helpText">{app.translator.trans('fof-drafts.forum.schedule_draft_modal.text')}</p>
                    <div className="Form-group flatpickr">
                        <input
                            name="scheduledFor"
                            className="FormControl flatpickr-input"
                            data-input
                        />
                    </div>
                    <div className="Form-group">
                        {Button.component({
                            className: 'Button Button--primary Button--block',
                            type: 'submit',
                            loading: this.loading,
                            children: app.translator.trans('fof-drafts.forum.schedule_draft_modal.submit_button'),
                        })}
                    </div>
                </div>
            </div>
        ];
    }

    config(isInitialized) {
        if (isInitialized) return;

        this.flatpickr = flatpickr('.flatpickr-input', {
            enableTime: true,
            enableSeconds: false,
            minDate: Date.now(),
            maxDate: new Date(9999, 12, 31),
            defaultDate: this.props.draft.scheduledFor()
        });
    }

    onsubmit(e) {
        e.preventDefault();

        const scheduledFor = new Date(document.getElementsByName("scheduledFor")[0].value);

        // If the user hasn't actually entered a different email address, we don't
        // need to do anything. Woot!
        if (scheduledFor.getTime() === this.props.draft.scheduledFor().getTime()) {
            m.redraw();
            return;
        }

        this.loading = true;

        this.props.draft
            .save(
                { scheduledFor }
            )
            .then(() => (this.success = true))
            .catch(() => { })
            .then(this.loaded.bind(this));
    }
}