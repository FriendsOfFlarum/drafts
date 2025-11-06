export default class ScheduleDraftModal extends FormModal<import("flarum/common/components/FormModal").IFormModalAttrs, undefined> {
    constructor();
    date: any;
    time: any;
    previewFormatString: any;
    oninit(vnode: any): void;
    title(): string | any[];
    content(): JSX.Element | (string | JSX.Element)[];
    /**
     * Returns a Date object for currently entered values in the modal.
     */
    scheduledFor(): Date;
    /**
     * Whether the modal's details have been modified.
     */
    changed(): boolean;
    isScheduled(): boolean;
    formattedDateTime(): any;
    unschedule(e: any): void;
    success: boolean | undefined;
    onsubmit(e: any): void;
}
import FormModal from "flarum/common/components/FormModal";
