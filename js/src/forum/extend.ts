import Extend from 'flarum/common/extenders';
import User from 'flarum/common/models/User';
import Draft from './models/Draft';

export default [
  new Extend.Routes() //
    .add('drafts', '/drafts', () => import('./components/DraftsPage').then((module) => module.default)),

  new Extend.Store() //
    .add('drafts', Draft),

  new Extend.Model(User) //
    .hasMany<Draft>('drafts')
    .attribute<number>('draftCount'),
];
