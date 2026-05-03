It allows storing files in a Telegram channel.

```js
import telestorage, { init, mkdir, dir } from "telestorage";

init("BOT_TOKEN", -1001234567890);
await mkdir("docs", "/");
console.log(await dir("/"));

// The default export exposes the same API:
telestorage.init("BOT_TOKEN", -1001234567890);
```
