# Ollama 本地翻译（Bob 插件）

一个只调用本机 [Ollama](https://ollama.com/) 的 Bob 流式翻译插件。原文和译文不会由插件发送到任何第三方在线服务。

## 功能

- 直接调用 Ollama 原生 `/api/chat`
- Bob 流式翻译输出
- 源语言与目标语言相同时，自动执行文本润色和语法纠错
- 独立控制模型是否思考，以及 Bob 是否展示思考过程
- 内置自然度优先的翻译 Prompt，并严格保留 ID、代码和占位符
- 自定义模型、Temperature、Keep Alive 和系统 Prompt
- 通过 `/api/tags` 验证 Ollama 连接与模型配置
- 仅接受 `localhost`、`127.0.0.1` 和 `::1` 回环地址
- 支持 Bob 取消信号以及 170 秒请求超时
- 支持 Bob 内置插件更新检查

## 使用要求

- macOS 上已安装并启动 Ollama
- Bob 1.15.0 或更高版本
- 至少安装一个适合翻译的本地模型

检查服务和模型：

```bash
ollama list
curl http://127.0.0.1:11434/api/tags
```

如果还没有模型，可使用 Ollama CLI 拉取所需模型：

```bash
ollama pull <模型名称>
```

安装插件后，在 Bob 的插件设置中填写 `ollama list` 显示的模型名称，然后点击验证。

当 Bob 中选择的源语言与目标语言相同时，插件会自动修正语法、拼写和标点，并改善表达的自然度；不会将文本翻译为其他语言。填写自定义系统 Prompt 后，以自定义指令为准。

`0.2.1` 之前的版本没有内置更新源，需要手动安装一次 `0.2.1` 或更高版本；之后即可在 Bob 插件列表中检查更新。

## 配置

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| Ollama 地址 | `http://127.0.0.1:11434` | 仅支持本机回环地址 |
| 模型名称 | 无 | 必须与本地模型名称匹配 |
| 模型思考 | 关闭 | 可选择自动、开启或低/中/高 |
| 显示思考过程 | 隐藏 | 仅控制 Bob 界面是否展示思考内容 |
| Temperature | `0.2` | 允许 0 到 2 |
| Keep Alive | `5m` | 模型在内存中的保留时间 |
| 自定义系统 Prompt | 无 | 留空时自动选择翻译或润色 Prompt；支持 `{sourceLanguage}` 和 `{targetLanguage}` |

## 本地开发

项目使用 Node.js 18+ 和 pnpm：

```bash
pnpm install
pnpm check
```

构建结果位于：

```text
dist/bob-plugin-ollama-translator-v0.2.1.bobplugin
```

`.bobplugin` 压缩包根目录只包含 Bob 所需的 `main.js` 和 `info.json`。

## 项目结构

```text
src/main.ts       Bob 导出入口与配置验证
src/translate.ts  翻译流程和 Bob 结果组装
src/ollama.ts     Ollama /api/chat 与 /api/tags 客户端
src/ndjson.ts     增量 NDJSON 解析器
src/prompt.ts     翻译 Prompt
src/config.ts     本地配置校验
public/info.json  Bob 插件清单
```

## License

[MIT](LICENSE)
