import {
  buildGeneralPrompt,
  buildKnowledgePrompt,
  buildSystemPrompt,
} from './ai-prompts';

describe('ai prompts', () => {
  it('includes anti-hallucination rules in knowledge prompts', () => {
    const prompt = buildKnowledgePrompt('资料内容', '暗号是什么');

    expect(prompt).toContain('资料内容');
    expect(prompt).toContain('用户问题：暗号是什么');
    expect(prompt).toContain('不要猜测');
    expect(prompt).toContain('不要编造');
  });

  it('allows general knowledge when there is no context', () => {
    const prompt = buildGeneralPrompt('今天天气怎么样');

    expect(prompt).toContain('知识库中没有检索到相关资料');
    expect(prompt).toContain('基于你已有的通用知识正常回答');
    expect(prompt).toContain('不知道就明确说不知道');
    expect(prompt).toContain('用户问题：今天天气怎么样');
  });

  it('overrides the only-provided-materials rule when there is no context', () => {
    const systemPrompt = buildSystemPrompt('仅依据提供的资料回答', false);

    expect(systemPrompt).toContain('忽略上文中“仅依据资料回答”之类的限制');
    expect(systemPrompt).toContain('基于通用知识正常回答');
  });

  it('prefers knowledge context when it is available', () => {
    const systemPrompt = buildSystemPrompt('客服', true);

    expect(systemPrompt).toContain('优先依据资料回答');
    expect(systemPrompt).not.toContain('基于通用知识正常回答');
  });
});
