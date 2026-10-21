# Skill 1：小说阅读平台后端 API 开发

## 角色
你是一名资深 Node.js 后端工程师，使用 NestJS 框架开发一个小说阅读平台的后端 API 服务。

## 技术栈要求
- 框架：NestJS 10 + TypeScript
- 数据库：MySQL 8.0 + TypeORM
- 缓存：Redis 7 + @nestjs/cache-manager
- 认证：JWT (Passport)
- 校验：class-validator + class-transformer
- 配置：@nestjs/config

## 项目背景
开发一个网络小说阅读平台的后端 API，前端是 H5 移动端和 Vue 管理后台。核心功能包括用户认证、书籍浏览、章节阅读、收藏、评论、订单支付。

## 数据库表结构（10张表）

### users 用户表
- id: bigint PK auto_increment
- openid: varchar(64) unique（微信网页授权获取）
- unionid: varchar(64) 可空
- nickname: varchar(50) 默认''
- avatar_url: varchar(255) 默认''
- phone: varchar(20) 可空
- gender: tinyint 默认0
- vip_level: tinyint 默认0 (0普通/1月VIP/2年VIP)
- vip_expire_at: datetime 可空
- balance: decimal(10,2) 默认0.00 (阅币余额)
- status: tinyint 默认1 (1正常/0禁用)
- created_at, updated_at: datetime

### categories 分类表
- id: int PK
- name: varchar(30) 分类名
- icon: varchar(255)
- sort: int 默认0
- status: tinyint 默认1

### books 书籍表
- id: bigint PK
- category_id: int 分类ID
- title: varchar(100) 书名
- author: varchar(50) 作者
- cover_url: varchar(255) 封面
- description: text 简介
- tags: varchar(255) 逗号分隔标签
- word_count: int 默认0
- chapter_count: int 默认0
- status: tinyint 默认1 (1连载/2完结)
- is_vip: tinyint 默认0 (0免费/1付费)
- price_per_chapter: decimal(5,2) 默认0.10
- free_chapters: int 默认10
- read_count: bigint 默认0
- score: decimal(2,1) 默认0.0
- published_at: datetime
- created_at, updated_at: datetime

### chapters 章节表
- id: bigint PK
- book_id: bigint 书籍ID
- chapter_num: int 章节序号
- title: varchar(200) 章节标题
- content: mediumtext 正文
- word_count: int 默认0
- is_free: tinyint 默认0 (0付费/1免费)
- status: tinyint 默认1 (1已发布/0草稿)
- created_at, published_at: datetime
- 唯一索引: (book_id, chapter_num)

### favorites 收藏表
- id: bigint PK
- user_id: bigint
- book_id: bigint
- created_at: datetime
- 唯一索引: (user_id, book_id)

### read_history 阅读历史表
- id: bigint PK
- user_id: bigint
- book_id: bigint
- chapter_id: bigint
- progress: int 默认0 (百分比)
- updated_at: datetime
- 唯一索引: (user_id, book_id)

### comments 评论表
- id: bigint PK
- user_id: bigint
- book_id: bigint
- chapter_id: bigint 可空
- content: varchar(500)
- like_count: int 默认0
- status: tinyint 默认1
- created_at: datetime

### orders 订单表
- id: bigint PK
- order_no: varchar(32) unique
- user_id: bigint
- type: tinyint (1章节购买/2VIP充值/3阅币充值)
- target_id: bigint 可空
- book_id: bigint 可空
- amount: decimal(10,2) 金额(元)
- coins: int 默认0 获得阅币
- status: tinyint 默认0 (0待支付/1已支付/2已取消/3已退款)
- paid_at: datetime 可空
- created_at: datetime

### banners 首页轮播图表
- id: int PK
- title: varchar(100)
- image_url: varchar(255)
- link_type: tinyint 默认1 (1书籍/2分类/3外链)
- link_target: varchar(255)
- sort: int 默认0
- status: tinyint 默认1
- start_at, end_at: datetime
- created_at: datetime

### admin_settings 管理后台系统设置表
- setting_key: varchar(50) PK，设置键（siteName/contact/email/version）
- setting_value: text，设置值
- updated_at: datetime，最后更新时间
- 系统设置通过键值表持久化；读取时合并默认值，更新时按键 upsert
- `DB_SYNCHRONIZE=false` 时必须先应用 `database/migrations/20261020_create_admin_settings.sql`

## API 接口清单

### 认证 /api/auth
- POST /api/auth/wx-login 微信网页授权登录（code换openid，返回JWT）
- POST /api/auth/phone-login 手机号+验证码登录
- GET /api/auth/profile 获取当前用户信息（需JWT）
- PUT /api/auth/profile 更新用户信息

### 书籍 /api/book
- GET /api/book/list 书籍列表（分页+分类+排序）
- GET /api/book/detail/:id 书籍详情
- GET /api/book/search 搜索
- GET /api/book/recommend 推荐列表

### 章节 /api/chapter
- GET /api/chapter/list/:bookId 章节列表（不含正文）
- GET /api/chapter/content/:id 章节正文（校验付费权限）

### 分类 /api/category
- GET /api/category/list 分类列表

### 收藏 /api/favorite（需JWT）
- POST /api/favorite/add 收藏
- DELETE /api/favorite/cancel 取消收藏
- GET /api/favorite/list 我的收藏
- GET /api/favorite/check/:bookId 是否已收藏

### 阅读历史 /api/read（需JWT）
- POST /api/read/save 保存进度
- GET /api/read/history 阅读历史

### 评论 /api/comment
- GET /api/comment/list/:bookId 评论列表
- POST /api/comment/add 发表评论
- POST /api/comment/like/:id 点赞

### 订单 /api/order（需JWT）
- POST /api/order/create 创建订单
- POST /api/order/notify 微信支付回调
- GET /api/order/list 我的订单

### Banner /api/banner
- GET /api/banner/list 首页轮播图

### 管理后台 /api/admin（需管理员JWT）
- POST /api/admin/login 管理员登录
- /api/admin/book/* 书籍CRUD
- /api/admin/chapter/* 章节CRUD
- /api/admin/category/* 分类CRUD
- /api/admin/banner/* Banner CRUD
- GET /api/admin/users 用户列表
- GET /api/admin/orders 订单列表
- GET /api/admin/stats 数据统计
- GET /api/admin/settings 获取系统设置
- PUT /api/admin/settings 更新并持久化系统设置（siteName、contact、email、version）
- GET /api/admin/comments 评论管理列表；PATCH /api/admin/comments/:id/status 切换显示状态
- POST /api/admin/upload 上传 JPG/PNG/WebP/GIF 图片（最大 5 MB）；返回图片 URL
- GET /api/admin/uploads/:filename 读取已上传图片
- POST /api/admin/chapters/batch 事务式批量导入章节正文

### 系统设置接口约定
- `GET /api/admin/settings` 与 `PUT /api/admin/settings` 均要求管理员 JWT
- 返回格式：`{ code: 0, message: 'success', data: { siteName, contact, email, version } }`
- `PUT` 校验站点名称、客服电话、邮箱和版本号；邮箱必须符合邮箱格式
- 设置保存在 `admin_settings` 键值表，首次读取时返回默认值
- 生产环境 `DB_SYNCHRONIZE=false` 时，部署前执行 `database/migrations/20261020_create_admin_settings.sql`

## 代码规范
1. 按模块组织：src/modules/{模块名}/controller.service.module
2. Entity 统一放 src/entities/
3. 统一返回格式：{ code: 0, message: 'success', data: {} }
4. 全局异常过滤器统一处理
5. JWT 守卫实现，需要登录的接口加 @UseGuards(JwtAuthGuard)
6. 管理员用 RolesGuard 区分权限
7. 热门数据加 Redis 缓存（书籍列表、章节列表）

## 验收标准
1. 所有接口正常返回，格式统一
2. 付费章节权限校验正确
3. JWT 认证流程完整
4. npm run start:dev 正常启动
5. 新安装数据库包含 10 张表；生产环境通过 SQL migration 更新结构
