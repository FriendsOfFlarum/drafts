import Component from 'flarum/common/Component';
import type Mithril from 'mithril';
import Draft from '../models/Draft';
import DraftsListState from '../states/DraftsListState';
export interface IAttrs {
    draft: Draft;
    state: DraftsListState;
}
export default class DraftsListItem extends Component<IAttrs> {
    private canSchedule;
    oncreate(vnode: Mithril.Vnode): void;
    getTags(): any[] | null;
    view(): JSX.Element;
}
