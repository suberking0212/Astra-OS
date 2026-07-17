# AstraOS 备份指南

本文档说明 AstraOS 仓库的日常代码备份、阶段快照、临时工作备份和数据库备份方法。

## 1. 基本原则

- 阶段完成后的固定代码快照使用 Git Tag。
- 尚未完成但需要远程保存的代码使用临时 Backup Branch。
- Pull Request 用于审核和合并修改，不作为备份方式。
- GitHub Remote 用于保存已经提交并推送的 Git 数据。
- PostgreSQL、`.env`、上传文件和本地运行数据不受 Git 保护，必须单独备份。

## 2. 阶段完成后创建 Tag 备份

每完成一个重要阶段，先切换到主分支并确认本地状态：

```bash
git switch workspace-main
git pull --ff-only
git status
```

确认工作区干净后创建带说明的备份标签：

```bash
git tag -a backup/phase1-20260717 -m "Phase 1 accepted backup"
git push origin backup/phase1-20260717
```

标签名称建议使用：

```text
backup/<阶段或里程碑>-<YYYYMMDD>
```

例如：

```text
backup/gate1-20260717
backup/phase2-contract-freeze-20260801
backup/mvp-exit-20260915
```

## 3. 查看和恢复 Tag 备份

查看全部备份标签：

```bash
git tag --list "backup/*"
```

查看某个备份的提交和说明：

```bash
git show backup/phase1-20260717
```

临时进入某个备份快照：

```bash
git switch --detach backup/phase1-20260717
```

查看完成后返回主分支：

```bash
git switch workspace-main
```

如果需要基于备份继续开发，应从 Tag 创建新分支，不要直接修改 detached HEAD：

```bash
git switch -c restore/phase1 backup/phase1-20260717
```

## 4. 未完成工作使用临时备份分支

代码尚未完成但需要保存到 GitHub 时，创建临时备份分支：

```bash
git switch -c backup/wip-20260717
git add -A
git commit -m "backup: work in progress"
git push -u origin backup/wip-20260717
```

备份完成后可以返回原开发分支：

```bash
git switch <原开发分支>
```

恢复临时备份分支：

```bash
git fetch origin
git switch backup/wip-20260717
```

临时备份确认不再需要后，再删除本地和远程分支：

```bash
git branch -d backup/wip-20260717
git push origin --delete backup/wip-20260717
```

删除前必须确认所需内容已经合并、迁移或通过 Tag 长期保存。

## 5. Tag、Branch 和 Pull Request 的区别

| 方式 | 用途 | 是否适合作为备份 |
| --- | --- | --- |
| Git Tag | 保存阶段完成时的固定快照 | 推荐用于正式里程碑备份 |
| Backup Branch | 保存尚未完成的临时工作 | 推荐用于 WIP 临时备份 |
| Pull Request | 审核、运行 CI 和合并修改 | 不作为备份方式 |
| GitHub Remote | 远程保存已推送的 commit、branch 和 tag | 是 Git 数据的远程副本 |

## 6. PostgreSQL 数据库备份

Git 不会备份 PostgreSQL 数据。创建数据库备份：

```bash
pg_dump \
  -h localhost \
  -p 55432 \
  -U astraos \
  -Fc astraos \
  > astraos-$(date +%Y%m%d-%H%M).dump
```

建议把备份文件保存到仓库目录之外，并进行加密或访问权限控制。数据库备份文件不得提交到 Git。

从备份恢复数据库前，应先确认目标数据库和数据覆盖风险：

```bash
pg_restore \
  -h localhost \
  -p 55432 \
  -U astraos \
  -d astraos \
  --clean \
  --if-exists \
  astraos-20260717-1200.dump
```

`--clean` 会删除备份中包含的现有数据库对象。执行恢复前必须确认目标环境正确。

## 7. Git 不会备份的内容

以下内容通常被 `.gitignore` 排除，需要单独处理：

- `.env` 和其他本地密钥配置。
- PostgreSQL 数据库。
- `services/api/.data` 中的上传文件和运行数据。
- `.logs` 中的本地日志。
- Docker volumes。
- 未提交的本地改动。

`.env` 可能包含密码、Token 和第三方 API Key，不得提交到 GitHub。应使用密码管理器或加密备份保存。

## 8. 推荐操作频率

- 每次 Gate 验收通过后：创建并推送一个 Tag。
- 每次大范围重构前：创建 Tag，并备份数据库。
- 每天结束但工作尚未完成时：推送 WIP Backup Branch。
- 数据迁移或高风险操作前：同时备份代码 Tag 和数据库。
- MVP、正式发布或重要演示前：创建带明确说明的 Tag，并验证备份可以读取。

## 9. 推荐检查清单

```text
[ ] 当前分支和目标版本正确
[ ] git status 已检查
[ ] 所有需要保存的代码已经 commit
[ ] Tag 或 Backup Branch 已推送到 origin
[ ] GitHub 上能够看到对应 Tag 或 Branch
[ ] 数据库已经单独备份
[ ] .env、上传文件和 Docker volumes 已按需备份
[ ] 恢复方式和备份说明已经记录
```

日常最简单的规则：阶段完成就创建 Tag；未完成但需要远程保存就创建 Backup Branch；数据库和密钥始终单独备份。
