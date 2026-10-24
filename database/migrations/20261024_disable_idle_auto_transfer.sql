-- 关闭“空闲自动转人工”后的历史数据清理（可选，手工执行一次）
-- 背景：原 ai-scheduler.service 每分钟扫描一次，把空闲超过 idleTransferMinutes
-- 的进行中会话自动置为 status=1（待转人工）。该行为已下线，仅保留用户主动转人工。

-- 1. 删除系统自动转人工写入的提示消息
DELETE FROM `ai_messages`
WHERE JSON_UNQUOTE(JSON_EXTRACT(`meta`, '$.action')) = 'idle_transfer';

-- 2. 把“被系统自动转人工且尚未被客服接管”的会话恢复为 AI 进行中
UPDATE `ai_conversations`
SET `status` = 0,
    `transferred_by` = NULL,
    `transferred_at` = NULL
WHERE `status` = 1
  AND `transferred_by` = 'system';

-- 3. 删除已废弃的配置项（后端代码已不再读取）
DELETE FROM `ai_settings`
WHERE `setting_key` = 'idleTransferMinutes';
