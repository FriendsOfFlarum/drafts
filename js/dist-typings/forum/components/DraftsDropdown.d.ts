/// <reference types="mithril" />
import HeaderDropdown from 'flarum/forum/components/HeaderDropdown';
export default class DraftsDropdown extends HeaderDropdown {
    static initAttrs(attrs: any): void;
    getContent(): JSX.Element;
    goToRoute(): void;
    getUnreadCount(): number;
    getNewCount(): number;
}
