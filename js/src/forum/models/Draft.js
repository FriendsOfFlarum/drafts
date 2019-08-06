/*
 *
 *  This file is part of fof/drafts.
 *
 *  Copyright (c) 2019 FriendsOfFlarum.
 *
 *  For the full copyright and license information, please view the LICENSE.md
 *  file that was distributed with this source code.
 *
 */
import Model from 'flarum/Model';
import mixin from 'flarum/utils/mixin';

export default class Draft extends mixin(Model, {
    user: Model.hasOne('user'),
    content: Model.attribute('content'),
    title: Model.attribute('title'),
    relationships: Model.attribute('relationships'),
    updatedAt: Model.attribute('updatedAt', Model.transformDate),
}) {}
