# bw-ssh

Use Bitwearden to store SSH config and private keys and load them into ssh agent.

1. Put your private keys into bitwarden folder with the name `ssh` as follows:

    1. Create secure note item, put private key content into `notes` field,
       make sure trailing new line is present
    2. If your key is protected with the password, put it into hidden field with
       the name `password`
    3. If you want to put public key as well, store it within custom text field
       `public`, it will be stored on fs with suffix `.pub` added
    4. Name item with the name as you want it published inside `~/.ssh` folder

2. Put your ssh config file into the same `ssh` folder with the name `config`.
    `Include` and `IdentityFile` options will be processed and replaced with the
    filenames from other items (if exist).

Subfolders in file names are supported as well.

## Example

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
    IdentityFile /Users/me/.ssh/other/me.key

### Item name: other/me.key

    ----BEGIN .....
    .....
    ----END .......

## Changelog

### 1.0.6
  * set SSH_ASKPASS_REQUIRE to 'force'
