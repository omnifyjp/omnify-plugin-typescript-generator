/**
 * Built-in validation message templates for common languages.
 * Templates use ${displayName}, ${min}, ${max}, ${pattern} placeholders.
 */

export interface ValidationTemplates {
  readonly required: Record<string, string>;
  readonly minLength: Record<string, string>;
  readonly maxLength: Record<string, string>;
  readonly min: Record<string, string>;
  readonly max: Record<string, string>;
  readonly email: Record<string, string>;
  readonly url: Record<string, string>;
  readonly pattern: Record<string, string>;
  readonly enum: Record<string, string>;
}

/**
 * Default validation message templates.
 * Supports: ja (Japanese), en (English), vi (Vietnamese), ko (Korean), zh (Chinese)
 */
export const DEFAULT_VALIDATION_TEMPLATES: ValidationTemplates = {
  required: {
    ja: '${displayName}は必須です',
    en: '${displayName} is required',
    vi: '${displayName} là bắt buộc',
    ko: '${displayName}은(는) 필수입니다',
    zh: '${displayName}为必填项',
  },
  minLength: {
    ja: '${displayName}は${min}文字以上で入力してください',
    en: '${displayName} must be at least ${min} characters',
    vi: '${displayName} phải có ít nhất ${min} ký tự',
    ko: '${displayName}은(는) ${min}자 이상이어야 합니다',
    zh: '${displayName}至少需要${min}个字符',
  },
  maxLength: {
    ja: '${displayName}は${max}文字以内で入力してください',
    en: '${displayName} must be at most ${max} characters',
    vi: '${displayName} tối đa ${max} ký tự',
    ko: '${displayName}은(는) ${max}자 이하여야 합니다',
    zh: '${displayName}不能超过${max}个字符',
  },
  min: {
    ja: '${displayName}は${min}以上の値を入力してください',
    en: '${displayName} must be at least ${min}',
    vi: '${displayName} phải lớn hơn hoặc bằng ${min}',
    ko: '${displayName}은(는) ${min} 이상이어야 합니다',
    zh: '${displayName}不能小于${min}',
  },
  max: {
    ja: '${displayName}は${max}以下の値を入力してください',
    en: '${displayName} must be at most ${max}',
    vi: '${displayName} phải nhỏ hơn hoặc bằng ${max}',
    ko: '${displayName}은(는) ${max} 이하여야 합니다',
    zh: '${displayName}不能大于${max}',
  },
  email: {
    ja: '${displayName}の形式が正しくありません',
    en: '${displayName} is not a valid email address',
    vi: '${displayName} không phải là địa chỉ email hợp lệ',
    ko: '${displayName} 형식이 올바르지 않습니다',
    zh: '${displayName}不是有效的邮箱地址',
  },
  url: {
    ja: '${displayName}は有効なURLではありません',
    en: '${displayName} is not a valid URL',
    vi: '${displayName} không phải là URL hợp lệ',
    ko: '${displayName}은(는) 유효한 URL이 아닙니다',
    zh: '${displayName}不是有效的URL',
  },
  pattern: {
    ja: '${displayName}の形式が正しくありません',
    en: '${displayName} format is invalid',
    vi: '${displayName} không đúng định dạng',
    ko: '${displayName} 형식이 올바르지 않습니다',
    zh: '${displayName}格式不正确',
  },
  enum: {
    ja: '${displayName}の値が無効です',
    en: '${displayName} has an invalid value',
    vi: '${displayName} có giá trị không hợp lệ',
    ko: '${displayName} 값이 유효하지 않습니다',
    zh: '${displayName}的值无效',
  },
};

/**
 * Merge user templates with default templates.
 */
export function mergeValidationTemplates(
  userTemplates?: Partial<ValidationTemplates>
): ValidationTemplates {
  if (!userTemplates) {
    return DEFAULT_VALIDATION_TEMPLATES;
  }

  // Create mutable copies of each template category
  const merged: Record<keyof ValidationTemplates, Record<string, string>> = {
    required: { ...DEFAULT_VALIDATION_TEMPLATES.required },
    minLength: { ...DEFAULT_VALIDATION_TEMPLATES.minLength },
    maxLength: { ...DEFAULT_VALIDATION_TEMPLATES.maxLength },
    min: { ...DEFAULT_VALIDATION_TEMPLATES.min },
    max: { ...DEFAULT_VALIDATION_TEMPLATES.max },
    email: { ...DEFAULT_VALIDATION_TEMPLATES.email },
    url: { ...DEFAULT_VALIDATION_TEMPLATES.url },
    pattern: { ...DEFAULT_VALIDATION_TEMPLATES.pattern },
    enum: { ...DEFAULT_VALIDATION_TEMPLATES.enum },
  };

  // Merge user templates
  for (const [key, value] of Object.entries(userTemplates)) {
    if (value && key in merged) {
      merged[key as keyof ValidationTemplates] = {
        ...merged[key as keyof ValidationTemplates],
        ...value,
      };
    }
  }

  return merged as ValidationTemplates;
}

/**
 * Format a validation message with placeholders.
 */
export function formatValidationMessage(
  template: string,
  vars: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

/**
 * Get validation messages for all configured locales.
 * Fallback order: locale -> fallbackLocale -> 'en'
 */
export function getValidationMessages(
  templates: ValidationTemplates,
  ruleType: keyof ValidationTemplates,
  locales: string[],
  vars: Record<string, string | number>,
  fallbackLocale?: string
): Record<string, string> {
  const ruleTemplates = templates[ruleType];
  const messages: Record<string, string> = {};

  for (const locale of locales) {
    // Try: locale -> fallbackLocale -> 'en'
    const template = ruleTemplates[locale]
      ?? (fallbackLocale ? ruleTemplates[fallbackLocale] : undefined)
      ?? ruleTemplates['en']
      ?? '';
    messages[locale] = formatValidationMessage(template, vars);
  }

  return messages;
}
