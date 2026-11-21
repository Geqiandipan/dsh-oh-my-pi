# dsh-oh-my-pi

把任务从 DeepSeek Harness 委派给你本地的 **oh-my-pi** 编码代理，并在左侧栏
**OMP** 入口里查看它做过的每一次委派。

- **宿主侧**——在 Harness 的子代理接缝上注册一个一次性 provider（`omp`），
  并把 `subagent_omp` 工具暴露给每个 Agent。
- **浏览器侧**——左侧栏入口，以及一个展示 provider 配置、运行环境与已完成
  运行记录的面板。

provider 会在委派方 Session 的工作区里新开一个无人值守的 `pi` 会话（装了
oh-my-pi 扩展时就是它的编排器模式），**只回传最终答案**。推理过程、工具调用
与 stderr 都留在子进程里。

## 前置条件

本插件**不会**安装 oh-my-pi，请先装好 CLI 与扩展：

```sh
# Pi CLI
npm install -g @earendil-works/pi-coding-agent

# oh-my-pi 编排器扩展（可选，但推荐）
pi install npm:oh-my-pi
```

`pi` 必须在宿主的 `PATH` 上；否则用 `cliPath` 指向它（见
[配置](#配置)）。

插件本身需要 **DeepSeek Harness 0.2.2 或更新版本**。

## 安装

从 npm：

```sh
dsh plugin --profile <profile> add dsh-oh-my-pi
```

从源码：

```sh
dsh plugin --profile <profile> add github:OWNER/dsh-oh-my-pi
```

若安装器提示需要重启，重启宿主即可。**OMP** 入口会出现在左侧栏，
`subagent_omp` 工具对每个 Agent 可见。

## 配置

bundle 的默认值不需要任何本地路径：provider 直接从宿主 `PATH` 上运行 `pi`。
要改就在自己 profile 的 `cordis.patch.yml` 里覆盖：

```yaml
- id: subagent-oh-my-pi
  name: 'dsh-oh-my-pi'
  config:
    providerName: omp
    cliPath: 'C:\Users\you\.dsh\tools\pi\node_modules\@earendil-works\pi-coding-agent\dist\cli.js'
    model: 'minimax-cn/MiniMax-M3'
    thinkingLevel: high
    apiKeyEnv: MINIMAX_CN_API_KEY
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `providerName` | `omp` | provider 在 `ctx.subagents` 上的注册名。 |
| `command` | `pi` | `cliPath` 为空时使用的可执行文件，走宿主 `PATH` 解析。 |
| `commandArgs` | `[]` | 放在 pi 参数之前的额外参数。 |
| `cliPath` | `''` | pi 的 `dist/cli.js` 绝对路径；设置后子进程用它配宿主运行时启动。 |
| `nodePath` | `''` | 与 `cliPath` 一起使用的 Node 可执行文件；留空表示用宿主运行时。 |
| `model` | `''` | 以 `--model provider/id` 传给 pi 的模型；留空沿用 pi 自己的选择。 |
| `thinkingLevel` | `''` | 以 `--thinking` 传给 pi 的思考等级。 |
| `extraArgs` | `[]` | 放在插件自身参数之后的额外 pi 参数。 |
| `env` | `{}` | 叠加在（已清洗的）父进程环境之上的显式环境变量。 |
| `apiKeyEnv` | `''` | 以该环境变量名交给子进程的凭据引用。 |
| `timeoutMs` | `900000` | 单次委派的挂钟预算。 |
| `disposeGraceMs` | `3000` | 子进程分级终止之间的宽限时间。 |

### 凭据

`apiKeyEnv` 指向 Harness 凭据库里的一条凭据（**模型**页可以写入）。provider
通过凭据服务读取它，再以同名环境变量交给子进程，因此密钥不需要复制进
oh-my-pi 自己的配置里。如果 oh-my-pi 本来就能自己认证，把这个字段留空即可。

### 模型

默认情况下子进程沿用 oh-my-pi 自己配置的模型。设置 `model` 可以为委派固定
一条线路——`model` 用 pi 的 `--model provider/id` 写法，`thinkingLevel` 用 pi 的
`--thinking` 等级。

## OMP 面板

左侧栏入口打开的页面有四块：

- **委派**——provider 名、工具名、固定的模型与思考等级、单次运行预算。
- **运行环境**——子进程运行的程序、CLI 路径，以及配置的 API 密钥能否解析。
- **最近的运行**——已完成的运行，含状态、耗时、退出码与一小段答案预览。
- **用法**——如何把任务交给这个 provider。

页面从本地 Harness web 服务读取 `/omp/status`，每五秒刷新一次。运行记录写在
`$DSH_HOME/storages/omp-runs.json`（与 Harness 存储服务同一个目录），因此重启
后仍在，各个 Harness 进程读到的也是同一份：最多保留最近二十次运行，每条包含
运行 id、状态、耗时、退出码与一小段答案预览。凭据不会写进去。

## 行为与限制

- 每次委派一个新进程：不续跑、不恢复、不池化。
- 只有最终答案回到父 Session。子进程的推理、工具调用与 stderr 留在子进程里。
- 被取消的运行结算为 `aborted`；失败的进程结算为 `error`，附带简短诊断（阶段、
  退出码），绝不回传原始协议数据。
- 被委派的代理可能改动当前工作区里的文件；插件不会回滚这些改动。
- provider 不声明任何启动期能力：不能继承父对话、不能自带 preset、不能自行
  限制深度——与官方 Claude Code / Codex 子代理 bundle 相同的一次性契约。
- 关闭 bundle 会移除工具与侧栏入口；运行日志会留在磁盘上，直到你删掉它。

## 许可

MIT
