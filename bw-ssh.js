#!/usr/bin/env node

const { promises: fs, createWriteStream } = require("fs");
const { spawn } = require("child_process");
const path = require("path")
const readline = require("readline");

const folderName = 'ssh';
const sshRoot = path.join(process.env.HOME, ".ssh");

const bw = (args) => new Promise((ok, ko) => {
  let stdout = "";
  let stderr = "";

  const child = spawn("bw", args)
    .on("error", ko)
    .on("close", (code) => (code ? ko({ code, stdout, stderr }) : ok(stdout)));

  child.stdout.on("data", (d) => (stdout = `${stdout}${String(d)}`));
  child.stderr.on("data", (d) => (stderr = `${stderr}${String(d)}`));
});

const getSession = async () => {
  try {
    await bw(["login", "--check", "--quiet"])
  } catch (e) {
    if (e.code === "ENOENT") {
      throw new Error("Bitwarden is not installed, please install first");
    }

    throw new Error("Bitwarden not logged in, please login first with `bw login`");
  }

  const password = await new Promise((ok, ko) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const query = "Enter your password: ";
    rl._writeToOutput = function _writeToOutput() {
      rl.output.write(
        `\x1B[2K\x1B[200D${
          query
        }${
          Array.from(new Array(rl.line.length + 1)).join('*')
        }`);
    };

    rl.on('SIGINT', () => {
      rl.output.write('\n');
      rl.close();
      ko(new Error('Ctrl+C pressed, abort'));
    });

    rl.question(query, function (pwd) {
      rl.output.write('\n');
      rl.close();
      ok(pwd);
    });
  });

  try {
    return (await bw(["unlock", password])).replace(/.+BW_SESSION="([^"]+)".+/s, '$1');
  } catch (e) {
    throw new Error("Wrong password");
  }
}

const getFolders = async () => {
  try {
    return new Map(JSON.parse(await bw(["list", "folders"])).map((d) => [d.name, d.id]));
  } catch (e) {
    throw new Error("Can't fetch folders");
  }
};

const getItems = async (folderId) => {
  try {
    return new Map(
      JSON.parse(await bw(["list", "items", "--folderid", folderId || 'null'])).map((d) => [d.name, d])
    );
  } catch (e) {
    throw new Error("Can't fetch items");
  }
}

const writeContent = async (fileName, content) => {
  await fs.mkdir(path.dirname(fileName), { recursive: true });
  await fs.writeFile(fileName, content, {
    encoding: "utf-8",
    mode: 0600,
  });
};

const run = async () => {
  try {
    const session = await getSession();
    process.env.BW_SESSION = session;

    const folders = await getFolders();
    if (!folders.has(folderName)) {
      throw new Error("Bitwarden has no `${folderName}` folder present, exiting");
    }

    const items = await getItems(folders.get(folderName));

    for (const [name, item] of items) {
      const item = items.get(name);

      // expand filename
      let fileName = path.join(sshRoot, name);
      if (fileName[0] === '~') {
        fileName = path.join(process.env.HOME, fileName.slice(1))
      }

      const keyRe = /^-----BEGIN/m;
      const content = item.notes
        .replace(/([\s\t]*(?:include|identityfile)[\s\t]+["']?)(.*)(["']?[\s\t]*)/ig,
        (line, prefix, key, postfix) => {
          if (items.has(key)) {
            return `${prefix}${path.join(sshRoot, key)}${postfix}`;
          }

          return line;
        });
        await writeContent(fileName, content);

        if (keyRe.test(content)) {
          const public = item.fields?.find((field) => field.name === 'public')?.value;
          const password = item.fields?.find((field) => field.name === 'password')?.value;

          if (public) {
            await writeContent(`${fileName}.pub`, public);
          }

          await new Promise((ok, ko) => {
            const child = spawn("ssh-add", [fileName], {
              env: {
                ...process.env,
                DISPLAY: 'dummy',
                SSH_ASKPASS: process.argv[1]
              },
            })
              .on("error", ko)
              .on("close", (code) => code ? ko() : ok());

            child.stdin.write(`${password || ''}\n`);
            child.stderr.pipe(process.stderr);
            child.stdout.pipe(process.stderr);
          });

          // remove key from fs by security reason
          await fs.unlink(fileName);
        }
      }
  } catch (e) {
    console.log(e?.message || e);
    process.exit(1);
  }
};

if (process.argv[2] && process.argv[2].indexOf(`Enter passphrase for ${sshRoot}`) !== -1) {
  process.stdin.pipe(process.stdout);
  process.stdin.on("data", (d) => d.indexOf('\n') !== -1 && process.exit(0));
} else {
  run();
}
