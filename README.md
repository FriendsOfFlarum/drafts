# Drafts by FriendsOfFlarum

![License](https://img.shields.io/badge/license-MIT-blue.svg) [![Latest Stable Version](https://img.shields.io/packagist/v/fof/drafts.svg)](https://packagist.org/packages/fof/drafts) [![OpenCollective](https://img.shields.io/badge/opencollective-fof-blue.svg)](https://opencollective.com/fof/donate)

A [Flarum](http://flarum.org) extension. Enables saving of discussion drafts.

### Installation

Install with composer:

```sh
composer require fof/drafts:"*"
```

#### To enable the Scheduler, be sure to add the job to your crontab:

```sh
crontab -e
```

Then add

```sh
* * * * * cd /path-to-your-project && php flarum schedule:run
```

For more info, see [this blog post](https://discuss.flarum.org/d/24118-setup-the-flarum-scheduler-using-cron)

### Updating

```sh
composer update fof/drafts
```

### Links

[<img src="https://opencollective.com/fof/donate/button@2x.png?color=blue" height="25" />](https://opencollective.com/fof/donate)

- [Packagist](https://packagist.org/packages/fof/drafts)
- [GitHub](https://github.com/FriendsOfFlarum/drafts)

An extension by [FriendsOfFlarum](https://github.com/FriendsOfFlarum).
