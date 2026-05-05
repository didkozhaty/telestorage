It allows storing files in a Telegram channel.

```js
import telestorage, { init, mkdir, dir } from "telestorage";

init("BOT_TOKEN", -1001234567890);
await mkdir("docs", "/");
await telestorage.cd("~/docs");
console.log(await dir("/"));

// The default export exposes the same API:
telestorage.init("BOT_TOKEN", -1001234567890);
```

Paths are resolved from the current directory after `cd(pathOrMessageId)`.
Call `cd()` with no argument to return to root; paths starting with `~/` also resolve from root.
