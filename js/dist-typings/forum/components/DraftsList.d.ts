/// <reference types="mithril" />
import Component from 'flarum/common/Component';
import ItemList from 'flarum/common/utils/ItemList';
import type DraftsListState from '../states/DraftsListState';
interface DraftsListAttrs {
    state: DraftsListState;
}
export default class DraftsList extends Component<DraftsListAttrs> {
    protected observer: IntersectionObserver | undefined;
    oncreate(vnode: any): void;
    onremove(vnode: any): void;
    deleteAll(e: MouseEvent): void;
    controlItems(): ItemList<unknown>;
    view(): JSX.Element;
}
export {};
