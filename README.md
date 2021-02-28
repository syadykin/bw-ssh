bw-ssh
======

Load SSH config and private keys from bitwarden client and load them into ssh agent.

1. Put your private keys into bitwarden folder with the name `ssh` as follows:
  1. Create secure note item, put private key content into `notes` field,
     ensure trailing new line present
  2. If your key is protected with password, put it into hidden field whith
     the `password` name
  3. If you want to put public key as well, store it within custom text field
     `public`
  4. Name item with the name as you want it published inside `~/.ssh` folder
     (subfolders supported as well)

2. Put your ssh config file into the same folder with the name `config`
  1. `Include` and `IdentityFile` options will be processed and replaced with the
     file names from other items (subfolders supported too)

Example
-------

### Item name: config

    Include other/config

After processing:

    Include /Users/me/.ssh/config

### Item name: other/config

    Host example.com
    User me
    IdentityFile other/me.key

After processing:

    Host example.com
    User me
    IdentityFile /Users/me/.ssh/other/config

### Item name: othjer/me.key

    ----BEGIN .....
    .....
    ----END .......

