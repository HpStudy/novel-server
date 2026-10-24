const ANSWER_RULES = [
  '回答要求：',
  '1. 知道就明确回答；不知道、没有把握或信息不足时，直接说“我不知道”或“根据现有信息无法确认”，不要猜测。',
  '2. 不要编造事实、数字、日期、链接、政策、价格、承诺或来源。',
  '3. 不要声称自己查阅了未提供的资料，也不要假装拥有实时信息。',
  '4. 回答简洁、准确；不确定的部分要明确说明是不确定的。',
].join('\n');

export function buildKnowledgePrompt(
  context: string,
  question: string,
): string {
  return [
    '以下是从知识库检索到的资料，请优先依据这些资料回答：',
    context,
    '',
    ANSWER_RULES,
    '',
    `用户问题：${question}`,
  ].join('\n');
}

export function buildGeneralPrompt(question: string): string {
  return [
    '知识库中没有检索到相关资料。',
    '请基于你已有的通用知识正常回答用户问题；知道就回答，不知道就明确说不知道。',
    '',
    ANSWER_RULES,
    '',
    `用户问题：${question}`,
  ].join('\n');
}

export function buildSystemPrompt(
  systemPrompt: string,
  hasContext: boolean,
): string {
  const base = systemPrompt.trim() || '你是小说阅读平台客服。';
  if (hasContext) {
    return [
      base,
      '',
      '当前知识库检索到了相关资料：请优先依据资料回答；资料没有覆盖的内容，如果你确定，可以补充，但要与资料区分开。不确定的内容不要编造。',
    ].join('\n');
  }
  return [
    base,
    '',
    '当前知识库没有检索到相关资料：请忽略上文中“仅依据资料回答”之类的限制，基于通用知识正常回答。知道就明确回答；不知道或没有把握时，直接说“我不知道”或“根据现有信息无法确认”。严禁编造事实、数字、日期、链接、政策、价格、承诺或来源。',
  ].join('\n');
}
