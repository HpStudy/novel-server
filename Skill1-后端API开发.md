# Skill 1：小说阅读平台后端 API 开发（含 AI 智能客服）

## 角色
你是一名资深 Node.js 后端工程师，使用 NestJS 框架开发一个小说阅读平台的后端 API 服务。平台包含 C 端 H5、Vue 管理后台，并内置 AI 智能客服：用户在 H5 首页右下角打开 AI 客服弹框提问，系统基于公司知识库（向量检索 RAG）回答；每轮对话完整落库，管理后台可查看记录、接管转人工、维护知识库与 AI 配置。

## 技术栈要求
- 框架：NestJS 10 + TypeScript
- 数据库：MySQL 8.0 + TypeORM（业务数据，含 AI 会话/消息/知识库业务字段）
- 向量数据库：PostgreSQL 16 + pgvector 扩展（知识库向量检索，备选 Milvus）
- 缓存/限流：Redis 7 + @nestjs/cache-manager
- 认证：JWT (Passport)
- 校验：class-validator + class-transformer
- 配置：@nestjs/config
- LLM / Embedding：通过供应商 HTTP API 调用（OpenAI / 火山方舟 / 智谱，供应商可配置）
- 流式：SSE（text/event-stream）

## 项目背景
开发一个网络小说阅读平台的后端 API，前端是 H5 移动端和 Vue 管理后台。核心功能包括用户认证、书籍浏览、章节阅读、收藏、评论、订单支付。

新增：**AI 智能客服模块**。H5 首页右下角悬浮球唤起客服弹框，用户围绕公司/平台信息（书籍规则、会员权益、支付退款、账号问题等）提问；系统对知识库做向量检索，把命中的资料片段注入提示词，由 LLM 生成回答并带来源引用。每轮对话（含人工接管后的消息）都记录在库，管理后台可查询会话、查看消息、接管转人工、维护知识库文档和 AI 配置。这是正式上线功能，需满足权限隔离、限流、流式、异常兜底、数据可审计等生产要求。

## 数据库表结构

### 原有 10 张表（保持不变）
users、categories、books、chapters、favorites、read_history、comments、orders、banners、admin_settings。

### 新增业务表（MySQL，6 张）

#### ai_conversations AI 客服会话表
- id: bigint PK auto_increment
- session_no: varchar(32) unique，会话编号（如 AC202610230001，日期+当日序号）
- user_id: bigint 发起用户ID
- source: varchar(30) 默认 'home'，来源页面（首页弹框）
- status: tinyint 默认 0（0进行中/1待转人工/2人工已接管/3已结束，全端统一）
- last_message_at: datetime 最后消息时间
- transferred_by: varchar(10) 可空（user/agent），转人工触发方
- agent_id: bigint 可空，接手的客服管理员ID（关联 admin 用户）
- transferred_at: datetime 可空
- ended_at: datetime 可空
- created_at, updated_at: datetime
- 索引：(user_id)、(status)、(last_message_at)

#### ai_messages AI 对话消息表（每轮对话记录）
- id: bigint PK
- conversation_id: bigint 会话ID
- role: varchar(10)（user 用户 / assistant AI / agent 人工客服 / system 系统提示）
- content: text 消息内容
- msg_type: tinyint 默认 0（0文本/1图片，一期仅文本）
- status: tinyint 默认 0（0正常/1已撤回）
- meta: json 可空（AI 回复引用来源 [{docId, title, chunkIndex}]、耗时 ms、模型名；转人工/接管等 system 消息可存扩展字段）
- client_msg_id: varchar(64) 可空（客户端幂等ID，唯一索引 (client_msg_id) 可空需注意多空值兼容，推荐存 session 级去重表或用 null 之外的占位）
- created_at: datetime
- 索引：(conversation_id, id)

#### ai_knowledge_docs 知识库文档表
- id: bigint PK
- title: varchar(200) 标题
- content: longtext 可空，手工录入的正文（与 file_url 二选一）
- file_url: varchar(255) 可空，上传文件地址
- source_type: tinyint（1手工录入/2文件上传/3网页抓取）
- chunk_count: int 默认 0 切片数
- status: tinyint 默认 0（0待解析/1解析中/2已入库/3解析失败）
- fail_reason: varchar(500) 可空
- created_at, updated_at: datetime
- 索引：(status)、(created_at)

#### ai_knowledge_chunks 知识切片表（MySQL 存业务字段，向量存 pgvector）
- id: bigint PK
- doc_id: bigint 文档ID
- chunk_index: int 切片序号（从 0 开始）
- content: text 切片文本
- token_count: int 默认 0
- vector_id: varchar(64) 可空，pgvector 表 ai_vectors.id（关联键）
- 唯一索引：(doc_id, chunk_index)

#### ai_feedbacks 消息反馈表
- id: bigint PK
- message_id: bigint AI 消息ID
- user_id: bigint
- rating: tinyint（1有用/0无用）
- comment: varchar(255) 可空
- created_at: datetime
- 唯一索引：(message_id, user_id)

#### ai_settings AI 配置表（键值）
- setting_key: varchar(50) PK（llmProvider / llmModel / llmApiKey / embeddingModel / systemPrompt / welcomeMessage / topK / similarityThreshold / enableCitation / noHitFallback / allowUserTransfer / rateLimitPerMinute / sseTimeoutSec）
- setting_value: text
- updated_at: datetime
- 读取时合并默认值，更新时按键 upsert；llmApiKey 对外脱敏

### 向量表（PostgreSQL 16 + pgvector）

#### ai_vectors
- id: varchar(64) PK（UUID，与 ai_knowledge_chunks.vector_id 对应）
- doc_id: bigint 文档ID
- chunk_index: int 切片序号
- content: text 切片文本（冗余存储，便于审计与重建）
- embedding: vector(1536)（维度随 embedding 模型配置，默认 OpenAI text-embedding-3-small 1536 维）
- created_at: timestamptz
- 索引：HNSW 索引（embedding vector_cosine_ops）；数据量大且对召回精度要求高时可用 ivfflat

## 向量数据库（pgvector）说明
- 部署：PostgreSQL 16，执行 `CREATE EXTENSION IF NOT EXISTS vector;`
- 与 MySQL 切片表通过 vector_id 关联；删除文档时先删 ai_vectors 再删切片与文档（事务兜底：向量删除失败则标记文档为待清理）
- 检索：`SELECT ... ORDER BY embedding <=> $1 LIMIT $2`（余弦距离），再按 similarityThreshold 过滤
- 向量维度、检索 topK、阈值全部读 ai_settings，不允许写死在代码里

## AI 智能客服模块设计

### 模块目录
```
src/modules/ai/
├── conversation/          # 会话管理（controller/service/module）
├── message/               # 消息读写
├── knowledge/             # 知识库文档与切片管理
├── settings/              # AI 配置
├── rag.service.ts         # 检索→组装→生成 主流程
├── llm.service.ts         # LLM 供应商抽象（OpenAI/火山方舟/智谱）
├── embedding.service.ts   # Embedding 供应商抽象
├── vector.service.ts      # pgvector 读写（独立 DataSource）
└── ai-sse.service.ts      # SSE 事件封装
```

### RAG 问答主流程（POST /api/ai/chat）
1. 鉴权：JWT 用户只能访问自己的会话；会话不存在或非本人 → 403
2. 幂等：按 clientMsgId 去重（Redis SETNX，过期 10 分钟），重复请求直接返回已完成消息
3. 限流：Redis 滑动窗口，默认每用户 10 条/分钟（读 ai_settings.rateLimitPerMinute），超限 SSE 返回 error 事件并落 system 消息
4. 状态检查：会话已转人工（status=2）→ 不调 AI，SSE 返回 transfer 事件；已结束（status=3）→ 返回 error
5. 落库 user 消息，更新 last_message_at
6. 向量检索：问题经 embedding 化 → pgvector 取 topK（默认 5，读配置）→ 过滤阈值（默认 0.5，读配置）
7. 组装 prompt：系统提示词（读配置）+ 检索上下文（有命中时标注 [来源1]标题/切片序号；无命中时明确告知模型可基于通用知识回答）+ 用户问题；统一加入反幻觉规则：知道就明确回答，不知道或没有把握时直接说不知道，禁止编造事实、数字、日期、链接、政策、价格、承诺或来源
8. LLM 流式生成：逐片内容通过 SSE `message` 事件下发；结束后发送 `done` 事件（含 fullContent 与 citations）
9. 落库 assistant 消息（meta 存 citations、耗时、模型名）
10. 知识库无命中（包括知识库为空）仍正常调用 LLM，由模型基于通用知识回答或明确说不知道；仅 embedding/检索/LLM 调用异常或模型返回空内容时，使用 noHitFallback 兜底并提示可转人工；异常消息同样落库，便于后台审计
11. 全程打点：记录耗时、token 数到日志与统计表（可在 ai_settings 旁建 ai_stats_daily 日统计表，按天聚合）

### 转人工流程
- 用户主动申请：`POST /api/ai/session/:id/transfer` → status 0→1（待转人工），落 system 消息「用户申请转人工」；若会话已结束则拒绝
- 后台人工接管：`POST /api/admin/ai/conversations/:id/take-over` → status 1→2，写 agent_id、transferred_at、transferred_by=agent；落 system 消息「客服 已接管会话」
- 接管后：C 端 chat 接口不再走 AI（返回 transfer 事件提示），后续消息由客服经 `POST /api/admin/ai/conversations/:id/reply` 发送，role=agent，实时落库
- 客服或用户结束：status→3，写 ended_at
- 自动转人工已移除：会话不会因空闲或超时自动进入待转人工，只有用户主动申请（或后台接管）才转人工

### SSE 流式协议约定（与 H5 端对齐，三端以此为唯一契约）
- 请求：`POST /api/ai/chat`，Header `Authorization: Bearer {token}`
- 请求体：`{ conversationId: number, content: string, clientMsgId: string }`
- 响应：`Content-Type: text/event-stream`
- 事件名与 data（均为 JSON 字符串）：
  - `message`：`{ messageId, content, done: false }`（逐片增量）
  - `done`：`{ messageId, fullContent, citations: [{docId, title, chunkIndex}] }`
  - `transfer`：`{ status: 1|2, message }`（会话已转人工时下发）
  - `error`：`{ message, code }`（限流/鉴权/服务异常）
- 服务端超时默认 60s（sseTimeoutSec），超时自动补发 done；客户端断开时中止生成（用 AbortController 信号取消 LLM 调用），已生成内容仍落库

### 会话状态与消息角色枚举（全端统一）
- 会话状态 status：0进行中 / 1待转人工 / 2人工已接管 / 3已结束
- 消息角色 role：user / assistant（AI）/ agent（人工客服）/ system（系统提示）
- AI 回复引用 meta.citations：`[{docId, title, chunkIndex}]`

### 安全要求
- 会话隔离：所有 /api/ai/* 必须校验 conversation.user_id === 当前 JWT 用户
- Prompt 注入防护：系统提示词固定约束「仅依据资料回答」；用户输入长度上限（默认 500 字）、敏感词校验（复用评论敏感词服务）
- 知识库内容审核：文件上传白名单（TXT/MD/PDF/Word，复用 /api/admin/upload 通道但加文件类型校验），大小上限默认 10MB；解析失败记录 fail_reason
- 密钥保护：llmApiKey 只存后端 ai_settings，GET 返回时脱敏为 `sk-****末四位`；禁止打印到日志
- SSE 幂等与防重放：clientMsgId 幂等；会话结束后拒绝新消息

## API 接口清单

### 原有接口（全部保留）
认证 /api/auth、书籍 /api/book、章节 /api/chapter、分类 /api/category、收藏 /api/favorite、阅读历史 /api/read、评论 /api/comment、订单 /api/order、Banner /api/banner、管理后台 /api/admin（含 settings、upload、chapters/batch）。

### 新增：AI 客服 C 端 /api/ai（需用户 JWT）
- POST /api/ai/session 创建会话（返回 conversationId、sessionNo、welcomeMessage、status）
- GET /api/ai/session/:id 获取会话状态与基本信息
- GET /api/ai/session/:id/messages 历史消息（分页：page、pageSize，按 id 正序）
- POST /api/ai/chat 发送消息（SSE 流式，见协议）
- POST /api/ai/session/:id/transfer 用户申请转人工
- POST /api/ai/session/:id/close 结束会话
- POST /api/ai/message/:id/feedback 对 AI 回复反馈（rating: 1有用/0无用）

### 新增：管理后台 AI /api/admin/ai（需管理员 JWT）
- GET /api/admin/ai/conversations 会话列表（筛选：status、startTime、endTime、keyword[会话编号/用户昵称]；分页返回 { list, total, page, pageSize }）
- GET /api/admin/ai/conversations/:id 会话详情（含用户信息、状态、时间线）
- GET /api/admin/ai/conversations/:id/messages 消息记录（分页，role/content/meta 全量可见，供审计）
- POST /api/admin/ai/conversations/:id/take-over 人工接管（转人工生效）
- POST /api/admin/ai/conversations/:id/reply 客服回复（请求体 { content }，role=agent）
- POST /api/admin/ai/conversations/:id/close 结束会话
- GET /api/admin/ai/stats 会话统计（今日会话数、待转人工数、已接管数、AI 解决率[未转人工且已结束占比]、平均首响应时长、近 7 天会话/转人工趋势）
- GET /api/admin/ai/knowledge 知识库文档列表（分页 + 标题搜索）
- POST /api/admin/ai/knowledge 新增文档（body: { title, content?| fileUrl?| url? , sourceType }）
- POST /api/admin/ai/knowledge/:id/parse 触发解析入库（切分→embedding→写 pgvector→回填切片）
- PUT /api/admin/ai/knowledge/:id 编辑文档（编辑后必须重新 parse，旧向量先删后建）
- DELETE /api/admin/ai/knowledge/:id 删除文档（同步删 ai_vectors 与切片）
- GET /api/admin/ai/knowledge/:id/chunks 查看切片列表（含 embedding 状态）
- GET /api/admin/ai/settings 获取 AI 配置（llmApiKey 脱敏）
- PUT /api/admin/ai/settings 更新 AI 配置（按键 upsert；llmApiKey 为空字符串表示不修改）
- POST /api/admin/ai/test 测试检索与问答（body: { question, topK? }；返回命中切片与 AI 回答预览，不落库不入会话）

### 响应与分页约定
- 统一返回：`{ code: 0, message: 'success', data: {} }`（SSE 接口除外）
- 列表统一：`{ list, total, page, pageSize }`
- AI 配置返回：`{ llmProvider, llmModel, llmApiKeyMasked, embeddingModel, systemPrompt, welcomeMessage, topK, similarityThreshold, enableCitation, noHitFallback, allowUserTransfer, rateLimitPerMinute, sseTimeoutSec }`

## 代码规范
1. 按模块组织：src/modules/{模块名}/controller.service.module
2. Entity 统一放 src/entities/；AI 业务 Entity 放 src/entities/ai/ 子目录
3. 统一返回格式：{ code: 0, message: 'success', data: {} }
4. 全局异常过滤器统一处理（SSE 异常在 ai-sse.service 内收敛为 error 事件）
5. JWT 守卫实现，需要登录的接口加 @UseGuards(JwtAuthGuard)；管理员用 RolesGuard 区分权限
6. AI 模块新增约定：
   - LLM/Embedding 供应商抽象：定义 LLMProvider 接口（streamChat/generate），OpenAIProvider、DoubaoProvider、ZhipuProvider 各自实现，由 ai_settings.llmProvider 选择；禁止在 rag.service 里写死供应商细节
   - pgvector 使用独立 DataSource（src/datasources/vector.datasource.ts，连接 PG），不得与 MySQL TypeORM 混用
   - 限流用自定义装饰器 @RateLimit('ai-chat', limit) 基于 Redis
   - SSE 统一走 ai-sse.service（事件格式唯一出口），controller 不直接操作 res
   - 所有 AI 外部调用（LLM/Embedding）超时统一为可配置（默认 30s/10s），失败走兜底
   - 解析任务用异步队列（@nestjs/bull + Redis）：parse 接口只入队，进度状态由 knowledge 表 status 驱动
7. 热门数据加 Redis 缓存（书籍列表、章节列表）

## 部署与运维要求
- MySQL：新装库需含 16 张表（10 原有 + 6 新增）；生产/测试环境通过 `database/migrations/20261023_create_ai_tables.sql` 增量迁移；如需清理历史自动转人工数据，再执行 `20261024_disable_idle_auto_transfer.sql`（先备份 ai_conversations / ai_messages / ai_settings），可用 `database/scripts/apply-mysql-migration.sh` 执行
- PostgreSQL：`database/migrations/20261023_create_ai_vectors.sql`（建库建表建索引）
- 环境变量新增：VECTOR_DB_HOST/PORT/USER/PASSWORD/NAME、LLM_PROVIDER、LLM_API_KEY（部署密钥，运行时可用 ai_settings 覆盖但不推荐）、EMBEDDING_API_KEY、AI_API_BASE
- 定时任务：已移除 idle-transfer 空闲自动转人工扫描；如需统计聚合任务可另行注册

## 验收标准
1. 所有接口正常返回，格式统一；SSE 事件格式与本文档契约完全一致
2. 付费章节权限校验正确；JWT 认证流程完整；npm run start:dev 正常启动
3. AI 全链路：创建会话→提问→流式回答（带引用）→用户申请转人工→后台接管→客服回复→结束，每一步落库且后台可查
4. 知识库：文档上传/录入→解析→检索命中→回答带来源；删除文档后检索不再命中该内容
5. 会话隔离：用户 A 无法读取/操作用户 B 的会话；未登录无法调用 /api/ai/*
6. 限流、幂等、异常兜底生效：超限返回 error 事件；重复 clientMsgId 不重复生成；LLM 挂掉时返回兜底话术
7. AI 配置接口脱敏：llmApiKey 不回显明文；知识库上传超限/非法格式被拒绝并记录原因
8. 新装数据库含 16 张 MySQL 表 + pgvector 向量表；生产环境通过 SQL migration 更新结构
