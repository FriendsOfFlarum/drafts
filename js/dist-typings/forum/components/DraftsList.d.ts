/// <reference types="mithril" />
import Component from 'flarum/common/Component';
import ItemList from 'flarum/common/utils/ItemList';
import type DraftsListState from '../states/DraftsListState';
interface DraftsListAttrs {
    state: DraftsListState;
}
export default class DraftsList extends Component<DraftsListAttrs> {
    protected observer: IntersectionObserver | undefined;
    protected observedOffset: number | undefined;
    oncreate(vnode: any): void;
    onremove(vnode: any): void;
    /**
     * The observer only reports visibility changes, so re-observe after each page loads: that
     * makes it report the sentinel afresh, and a page that leaves it in view still loads the next.
     */
    observeSentinel(el: Element): void;
    deleteAll(e: MouseEvent): void;
    controlItems(): ItemList<unknown>;
    view(): JSX.Element;
}
export {};
